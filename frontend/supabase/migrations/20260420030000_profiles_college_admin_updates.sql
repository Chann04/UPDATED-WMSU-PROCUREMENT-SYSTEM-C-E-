-- =============================================================================
-- Allow College Admins (DeptHead users) to update profiles that belong to
-- their handled college — specifically so they can approve/decline pending
-- registration requests. Without this, Supabase RLS blocks the UPDATE and
-- PostgREST returns "Cannot coerce the result to a single JSON object"
-- because zero rows are affected.
--
-- WMSU Admins and the row's own user keep their existing update ability.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_by_own_admin_or_college_admin" ON public.profiles;

CREATE POLICY "profiles_update_by_own_admin_or_college_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.colleges c
      WHERE c.handler_id = auth.uid()
        AND c.name = public.profiles.department
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.colleges c
      WHERE c.handler_id = auth.uid()
        AND c.name = public.profiles.department
    )
  );

NOTIFY pgrst, 'reload schema';
