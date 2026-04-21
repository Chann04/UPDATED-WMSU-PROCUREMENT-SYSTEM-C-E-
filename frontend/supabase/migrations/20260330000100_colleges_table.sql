-- Colleges configuration for budget distribution
-- - Admin can add/remove colleges
-- - Each college can use percentage or direct amount allocation

CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  handler_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  allocation_mode TEXT NOT NULL DEFAULT 'percentage' CHECK (allocation_mode IN ('percentage', 'amount')),
  allocation_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON public.colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON public.colleges(is_active);

CREATE OR REPLACE FUNCTION public.colleges_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS colleges_updated_at_trigger ON public.colleges;
CREATE TRIGGER colleges_updated_at_trigger
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE PROCEDURE public.colleges_set_updated_at();

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.colleges;
CREATE POLICY "Allow all for authenticated"
  ON public.colleges FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.colleges TO authenticated;
GRANT ALL ON TABLE public.colleges TO service_role;

-- Seed defaults (safe if rerun)
INSERT INTO public.colleges (name, allocation_mode, allocation_value)
VALUES
  ('College of Computing Science', 'percentage', 33.33),
  ('College of Nursing', 'percentage', 33.33),
  ('College of Engineering', 'percentage', 33.34)
ON CONFLICT (name) DO NOTHING;

-- Ensure PostgREST sees new table/policies quickly
NOTIFY pgrst, 'reload schema';
