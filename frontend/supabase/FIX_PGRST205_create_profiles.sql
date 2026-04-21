-- Fix: PGRST205 — "Could not find the table 'public.profiles' in the schema cache"
-- Run in Supabase Dashboard → SQL Editor → New query → Run (entire script).
-- After success, wait a few seconds and hard-refresh the app (Ctrl+Shift+R).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Faculty' CHECK (role IN ('Faculty', 'DeptHead', 'Admin')),
  department TEXT,
  approved_budget NUMERIC(12, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.profiles;

CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department', '')), '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: users in auth without a profile row (optional; safe to re-run)
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'Faculty')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
