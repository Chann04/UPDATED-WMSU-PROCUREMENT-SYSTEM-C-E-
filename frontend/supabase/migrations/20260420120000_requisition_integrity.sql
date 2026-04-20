BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS submitted_payload_hash text,
  ADD COLUMN IF NOT EXISTS latest_payload_hash text,
  ADD COLUMN IF NOT EXISTS integrity_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_integrity_reason text;

CREATE TABLE IF NOT EXISTS public.request_integrity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'submit_locked',
      'admin_edit',
      'approved_with_reason',
      'declined_with_reason',
      'procurement_failed_with_reason',
      'legacy_backfill'
    )
  ),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  before_payload jsonb,
  after_payload jsonb,
  payload_hash_before text,
  payload_hash_after text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_integrity_events_request_id
  ON public.request_integrity_events(request_id, created_at DESC);

ALTER TABLE public.request_integrity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_integrity_events_read_auth ON public.request_integrity_events;
CREATE POLICY request_integrity_events_read_auth
  ON public.request_integrity_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS request_integrity_events_insert_auth ON public.request_integrity_events;
CREATE POLICY request_integrity_events_insert_auth
  ON public.request_integrity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS request_integrity_events_insert_service ON public.request_integrity_events;
CREATE POLICY request_integrity_events_insert_service
  ON public.request_integrity_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS request_integrity_events_update_none ON public.request_integrity_events;
CREATE POLICY request_integrity_events_update_none
  ON public.request_integrity_events
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS request_integrity_events_delete_none ON public.request_integrity_events;
CREATE POLICY request_integrity_events_delete_none
  ON public.request_integrity_events
  FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.compute_request_integrity_hash(
  p_item_name text,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_budget_fund_source_id uuid,
  p_college_budget_type_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      coalesce(trim(p_item_name), '') || '|' ||
      coalesce(trim(p_description), '') || '|' ||
      coalesce(p_quantity::text, '0') || '|' ||
      coalesce(p_unit_price::text, '0') || '|' ||
      coalesce(p_total_price::text, '0') || '|' ||
      coalesce(p_budget_fund_source_id::text, '') || '|' ||
      coalesce(p_college_budget_type_id::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_integrity_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_is_requester boolean;
  v_protected_changed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  v_is_requester := (OLD.requester_id = auth.uid());

  v_protected_changed := (
    NEW.item_name IS DISTINCT FROM OLD.item_name OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.quantity IS DISTINCT FROM OLD.quantity OR
    NEW.unit_price IS DISTINCT FROM OLD.unit_price OR
    NEW.total_price IS DISTINCT FROM OLD.total_price OR
    NEW.budget_fund_source_id IS DISTINCT FROM OLD.budget_fund_source_id OR
    NEW.college_budget_type_id IS DISTINCT FROM OLD.college_budget_type_id
  );

  IF v_role = 'Faculty' AND v_is_requester AND OLD.status <> 'Draft' THEN
    IF v_protected_changed THEN
      RAISE EXCEPTION 'Submitted requisitions are immutable for faculty.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'ProcurementDone' AND NEW.status = 'Received') THEN
        RAISE EXCEPTION 'Faculty can only confirm receipt when procurement is done.';
      END IF;
    END IF;
  END IF;

  IF v_role IN ('DeptHead', 'Admin') AND v_protected_changed THEN
    IF coalesce(trim(NEW.last_integrity_reason), '') = '' THEN
      RAISE EXCEPTION 'A reason is required for requisition edits.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_integrity_guardrails ON public.requests;
CREATE TRIGGER trg_enforce_request_integrity_guardrails
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_integrity_guardrails();

CREATE OR REPLACE FUNCTION public.update_request_integrity_version_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.event_type = 'admin_edit' THEN
      UPDATE public.requests
         SET integrity_version = greatest(1, coalesce(integrity_version, 1)) + 1,
             latest_payload_hash = coalesce(NEW.payload_hash_after, latest_payload_hash),
             last_integrity_reason = coalesce(NEW.reason, last_integrity_reason)
       WHERE id = NEW.request_id;
    ELSIF NEW.event_type IN ('approved_with_reason', 'declined_with_reason', 'procurement_failed_with_reason') THEN
      UPDATE public.requests
         SET last_integrity_reason = coalesce(NEW.reason, last_integrity_reason)
       WHERE id = NEW.request_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_integrity_events_apply_request_patch ON public.request_integrity_events;
CREATE TRIGGER trg_request_integrity_events_apply_request_patch
  AFTER INSERT ON public.request_integrity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_integrity_version_hash();

DO $$
DECLARE
  r record;
  v_hash text;
  v_structured boolean;
BEGIN
  FOR r IN
    SELECT id, item_name, description, quantity, unit_price, total_price, budget_fund_source_id, college_budget_type_id, status
    FROM public.requests
  LOOP
    v_structured := coalesce(r.description, '') LIKE '%Requisition Items:%' AND coalesce(r.description, '') LIKE '%Signatories:%';
    IF v_structured THEN
      v_hash := public.compute_request_integrity_hash(
        r.item_name,
        r.description,
        r.quantity,
        r.unit_price,
        r.total_price,
        r.budget_fund_source_id,
        r.college_budget_type_id
      );
      UPDATE public.requests
         SET submitted_payload_hash = coalesce(submitted_payload_hash, v_hash),
             latest_payload_hash = coalesce(latest_payload_hash, v_hash),
             integrity_version = coalesce(integrity_version, 1)
       WHERE id = r.id;

      INSERT INTO public.request_integrity_events (
        request_id,
        event_type,
        actor_id,
        reason,
        after_payload,
        payload_hash_after
      )
      SELECT r.id,
             'legacy_backfill',
             null,
             'Backfilled integrity hash for existing structured requisition.',
             jsonb_build_object(
               'item_name', r.item_name,
               'description', r.description,
               'quantity', r.quantity,
               'unit_price', r.unit_price,
               'total_price', r.total_price
             ),
             v_hash
      WHERE NOT EXISTS (
        SELECT 1 FROM public.request_integrity_events e
        WHERE e.request_id = r.id AND e.event_type = 'legacy_backfill'
      );
    ELSE
      UPDATE public.requests
         SET submitted_payload_hash = null,
             latest_payload_hash = null,
             last_integrity_reason = coalesce(last_integrity_reason, 'legacy_unhashed')
       WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
