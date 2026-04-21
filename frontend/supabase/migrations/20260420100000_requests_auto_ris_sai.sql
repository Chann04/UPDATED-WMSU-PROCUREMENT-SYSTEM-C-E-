-- Auto-generate RIS No. and SAI No. for procurement requests.
-- Format: RIS-YYYY-0001 / SAI-YYYY-0001 (Type-Year-4digit-Sequence, per calendar year).
--
-- Design:
--   1. Columns live on public.requests (ris_no, sai_no) so they can be indexed,
--      queried, and joined without parsing the legacy `description` blob.
--   2. A dedicated counter table (public.requisition_counters) gives us atomic,
--      race-free sequence generation via INSERT ... ON CONFLICT ... RETURNING.
--      This is immune to the "two concurrent submits read the same MAX" problem
--      that naive `SELECT MAX+1` approaches have.
--   3. Numbers are assigned by a BEFORE INSERT OR UPDATE trigger at the moment a
--      request transitions to 'Pending' (i.e. when it is "sent"). Drafts stay
--      unnumbered so users can abandon them without burning a sequence.
--   4. The trigger function is SECURITY DEFINER so it can always update the
--      counter regardless of the invoking user's RLS policies.

BEGIN;

-- 1. Add columns --------------------------------------------------------------

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS ris_no text,
  ADD COLUMN IF NOT EXISTS sai_no text;

-- Partial unique indexes: enforce uniqueness only once a number has been
-- assigned (drafts with NULLs are free to coexist).
CREATE UNIQUE INDEX IF NOT EXISTS requests_ris_no_unique
  ON public.requests (ris_no)
  WHERE ris_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS requests_sai_no_unique
  ON public.requests (sai_no)
  WHERE sai_no IS NOT NULL;

-- 2. Counter table ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.requisition_counters (
  year        text PRIMARY KEY,
  last_seq    bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requisition_counters ENABLE ROW LEVEL SECURITY;

-- Only the trigger function (SECURITY DEFINER) touches this table in practice,
-- but we still add a permissive policy so direct admin queries don't fail.
DROP POLICY IF EXISTS requisition_counters_read ON public.requisition_counters;
CREATE POLICY requisition_counters_read
  ON public.requisition_counters
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Sequence assignment function --------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_requisition_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq  bigint;
  v_tag  text;
BEGIN
  -- Only assign once, and only when the request is actually being sent
  -- (Draft -> Pending transition, or an initial INSERT that already carries
  -- Pending status).
  IF NEW.status = 'Pending'
     AND NEW.ris_no IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    v_year := to_char(COALESCE(NEW.created_at, now()), 'YYYY');

    -- Atomic increment: one row per year. ON CONFLICT takes a row-level lock,
    -- so concurrent submits are serialized for THIS YEAR ONLY.
    INSERT INTO public.requisition_counters (year, last_seq, updated_at)
         VALUES (v_year, 1, now())
    ON CONFLICT (year) DO UPDATE
       SET last_seq  = public.requisition_counters.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_tag := v_year || '-' || lpad(v_seq::text, 4, '0');
    NEW.ris_no := 'RIS-' || v_tag;
    NEW.sai_no := 'SAI-' || v_tag;
  END IF;

  RETURN NEW;
END;
$$;

-- SECURITY DEFINER functions must be owned by a trusted role; ensure the
-- function is callable by app users (Supabase `authenticated` role).
REVOKE ALL ON FUNCTION public.assign_requisition_numbers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_requisition_numbers() TO authenticated;

-- 4. Trigger ------------------------------------------------------------------

DROP TRIGGER IF EXISTS requests_assign_ris_sai ON public.requests;
CREATE TRIGGER requests_assign_ris_sai
  BEFORE INSERT OR UPDATE OF status
  ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_requisition_numbers();

-- 5. Backfill existing non-Draft requests -------------------------------------
-- Give every request that has already been submitted a RIS/SAI number so the
-- UI can render them consistently. We order by created_at so the first request
-- of each year gets -0001, the second -0002, etc.

DO $$
DECLARE
  r record;
  v_year text;
  v_seq  bigint;
  v_tag  text;
BEGIN
  FOR r IN
    SELECT id, created_at
      FROM public.requests
     WHERE status <> 'Draft'
       AND ris_no IS NULL
     ORDER BY created_at ASC
  LOOP
    v_year := to_char(COALESCE(r.created_at, now()), 'YYYY');

    INSERT INTO public.requisition_counters (year, last_seq, updated_at)
         VALUES (v_year, 1, now())
    ON CONFLICT (year) DO UPDATE
       SET last_seq  = public.requisition_counters.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_tag := v_year || '-' || lpad(v_seq::text, 4, '0');

    UPDATE public.requests
       SET ris_no = 'RIS-' || v_tag,
           sai_no = 'SAI-' || v_tag
     WHERE id = r.id;
  END LOOP;
END $$;

COMMIT;
