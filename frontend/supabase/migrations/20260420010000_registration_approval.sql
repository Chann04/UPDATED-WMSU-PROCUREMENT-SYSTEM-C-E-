-- =============================================================================
-- Self-sign-up + College Admin approval workflow.
--   * Adds `status` to `profiles` (Pending / Approved / Declined).
--   * Extends the handle_new_user() trigger so self-sign-ups land as Pending
--     and we persist the extra profile fields captured on the sign-up form.
--   * Existing profiles are marked Approved so this change is backwards
--     compatible with current users.
--
-- Password safety note:
--   Supabase Auth stores only bcrypt hashes of user passwords in auth.users.
--   Neither the WMSU Admin nor the College Admin can read raw passwords.
-- =============================================================================

-- Split-name columns (safe to re-run; older deployments may not have these).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name     TEXT,
  ADD COLUMN IF NOT EXISTS middle_initial TEXT,
  ADD COLUMN IF NOT EXISTS family_name    TEXT,
  ADD COLUMN IF NOT EXISTS faculty_department TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (status IN ('Pending', 'Approved', 'Declined'));

-- Backfill: any row that somehow ended up NULL/other -> Approved.
UPDATE public.profiles SET status = 'Approved' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Trigger function: called after a new auth.users row is inserted.
-- We read the custom user_metadata fields set by the sign-up flow and
-- build a matching profiles row. When the sign-up form flags
-- registration_status = 'Pending' (self sign-up for a Department user),
-- we mark the profile Pending so the account cannot log in until the
-- College Admin approves it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_name     TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  middle_initial TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'middle_initial', '')), '');
  family_name    TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'family_name', '')), '');
  full_name_meta TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  computed_full  TEXT := NULLIF(TRIM(CONCAT_WS(' ', first_name, middle_initial, family_name)), '');
  role_val       TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty');
  department_val TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department', '')), '');
  faculty_dept   TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'faculty_department', '')), '');
  status_val     TEXT := COALESCE(NEW.raw_user_meta_data->>'registration_status', 'Approved');
BEGIN
  IF status_val NOT IN ('Pending', 'Approved', 'Declined') THEN
    status_val := 'Approved';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    first_name,
    middle_initial,
    family_name,
    email,
    role,
    department,
    faculty_department,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(computed_full, full_name_meta, NEW.email),
    first_name,
    middle_initial,
    family_name,
    NEW.email,
    role_val,
    department_val,
    faculty_dept,
    status_val
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name          = EXCLUDED.full_name,
    first_name         = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    middle_initial     = COALESCE(EXCLUDED.middle_initial, public.profiles.middle_initial),
    family_name        = COALESCE(EXCLUDED.family_name, public.profiles.family_name),
    department         = COALESCE(EXCLUDED.department, public.profiles.department),
    faculty_department = COALESCE(EXCLUDED.faculty_department, public.profiles.faculty_department),
    status             = EXCLUDED.status;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
