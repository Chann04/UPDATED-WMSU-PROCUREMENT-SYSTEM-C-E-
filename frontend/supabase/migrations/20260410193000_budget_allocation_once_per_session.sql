-- ============================================================================
-- Enforce: WMSU Admin can allocate only once per college per budget session
-- New allocations must happen in a new budget session (new budget_id)
-- ============================================================================

-- Safety: ensure helper exists (already present in FIX_SUPABASE_profiles_login.sql)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
  IF lower(trim(jwt_role)) = 'admin' THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  );
END;
$$;

ALTER TABLE public.budget_allocation_history ENABLE ROW LEVEL SECURITY;

-- Replace permissive policies with admin-only policies.
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "bah_select_admin" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "bah_insert_admin" ON public.budget_allocation_history;

CREATE POLICY "bah_select_admin"
  ON public.budget_allocation_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "bah_insert_admin"
  ON public.budget_allocation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Enforce one allocation row per (budget session, college).
CREATE OR REPLACE FUNCTION public.enforce_single_allocation_per_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.budget_allocation_history h
    WHERE h.budget_id = NEW.budget_id
      AND h.college_id = NEW.college_id
  ) THEN
    RAISE EXCEPTION
      'Allocation already exists for this college in the current budget session. Start a new session to allocate again.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_allocation_per_session ON public.budget_allocation_history;
CREATE TRIGGER trg_single_allocation_per_session
  BEFORE INSERT ON public.budget_allocation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_allocation_per_session();

NOTIFY pgrst, 'reload schema';

