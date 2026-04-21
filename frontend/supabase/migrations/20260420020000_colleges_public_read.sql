-- =============================================================================
-- Allow anonymous (pre-login) visitors to READ the list of colleges so that the
-- public Sign-Up page at /signup can populate the "Select College" dropdown.
--
-- Writes are still restricted to authenticated users via the existing
-- "Allow all for authenticated" policy; this new policy only grants SELECT
-- to the `anon` role.
-- =============================================================================

DROP POLICY IF EXISTS "colleges_public_read" ON public.colleges;
CREATE POLICY "colleges_public_read"
  ON public.colleges FOR SELECT
  TO anon
  USING (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.colleges TO anon;

NOTIFY pgrst, 'reload schema';
