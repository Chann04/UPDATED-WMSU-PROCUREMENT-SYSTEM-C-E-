-- Faculty-only: department unit within the selected college (Users page "Department" field).
-- Run in Supabase → SQL Editor if this column is missing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS faculty_department text;

COMMENT ON COLUMN public.profiles.faculty_department IS 'Department within the college (Faculty users only).';
