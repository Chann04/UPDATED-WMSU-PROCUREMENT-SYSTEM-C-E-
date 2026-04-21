-- Make benh19193@gmail.com an Admin (user id from Authentication → Users)
-- Run in Supabase → SQL Editor → Run

INSERT INTO public.profiles (id, full_name, email, role, department, updated_at)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''), 'Admin User'),
  u.email,
  'Admin',
  NULL,
  now()
FROM auth.users u
WHERE u.id = 'd3a48435-da0d-4369-91c4-2e20c3e097ba'
ON CONFLICT (id) DO UPDATE
SET
  role = 'Admin',
  updated_at = now();
