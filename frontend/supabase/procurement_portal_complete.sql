-- =============================================================================
-- WMSU Procurement portal — run in Supabase SQL Editor AFTER core schema
-- (profiles, requests, suppliers, etc.). Safe to re-run: uses IF NOT EXISTS /
-- ON CONFLICT where possible.
--
-- Includes:
--   • landing_page (JSON sections for admin UI)
--   • transparency_seal_entries (Active Bidding)
--   • bid_bulletins (+ storage bucket for attachments)
--   • Public read policies for Bid Winners page (requests + suppliers)
-- =============================================================================

-- --- landing_page (from migrations/20250225000000_landing_page.sql) ----------
CREATE TABLE IF NOT EXISTS public.landing_page (
  section TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.landing_page (section, data) VALUES
  ('transparency', '{"mission":"","ctaPrimary":{"label":"Active Bidding","url":"/active-bidding"},"ctaSecondary":{"label":"Supplemental / Bid Bulletins","url":"/bid-bulletins"}}'),
  ('bidding', '{"rows":[]}'),
  ('documents', '{"items":[]}'),
  ('planning', '{"appItems":[],"pmr":{"title":"","description":"","url":""}}'),
  ('vendor', '{"accreditationTitle":"","accreditationDescription":"","accreditationUrl":"","loginTitle":"","loginDescription":"","loginUrl":"","links":[]}'),
  ('bac', '{"secretariatName":"","secretariatEmail":"","secretariatPhone":"","officeAddress":"","officeNote":""}')
ON CONFLICT (section) DO NOTHING;

ALTER TABLE public.landing_page ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read landing_page" ON public.landing_page;
CREATE POLICY "Anyone can read landing_page" ON public.landing_page FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can update landing_page" ON public.landing_page;
CREATE POLICY "Authenticated can update landing_page" ON public.landing_page FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert landing_page" ON public.landing_page;
CREATE POLICY "Authenticated can insert landing_page" ON public.landing_page FOR INSERT TO authenticated WITH CHECK (true);

-- --- transparency_seal_entries & bid_bulletins (see migrations/20260409120000) -
CREATE TABLE IF NOT EXISTS public.transparency_seal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mission TEXT,
  project_title TEXT NOT NULL DEFAULT '',
  reference_no TEXT NOT NULL DEFAULT '',
  abc NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_date DATE,
  opening_date DATE,
  location TEXT,
  description TEXT,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transparency_seal_display_order ON public.transparency_seal_entries(display_order);

ALTER TABLE public.transparency_seal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read transparency_seal_entries" ON public.transparency_seal_entries;
CREATE POLICY "Anyone can read transparency_seal_entries"
  ON public.transparency_seal_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated manage transparency_seal_entries" ON public.transparency_seal_entries;
CREATE POLICY "Authenticated manage transparency_seal_entries"
  ON public.transparency_seal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.bid_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'Bulletins',
  status TEXT NOT NULL DEFAULT 'Active',
  title TEXT NOT NULL DEFAULT '',
  reference_no TEXT NOT NULL DEFAULT '',
  date DATE,
  related_to TEXT,
  description TEXT,
  changes TEXT[] NOT NULL DEFAULT '{}',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bid_bulletins_display_order ON public.bid_bulletins(display_order);

ALTER TABLE public.bid_bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bid_bulletins" ON public.bid_bulletins;
CREATE POLICY "Anyone can read bid_bulletins"
  ON public.bid_bulletins FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated manage bid_bulletins" ON public.bid_bulletins;
CREATE POLICY "Authenticated manage bid_bulletins"
  ON public.bid_bulletins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Budget allocation history (append-only deltas per session)
CREATE TABLE IF NOT EXISTS public.budget_allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  dept_head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_budget_id
  ON public.budget_allocation_history (budget_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_college_id
  ON public.budget_allocation_history (college_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_created_at
  ON public.budget_allocation_history (created_at DESC);

ALTER TABLE public.budget_allocation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_allocation_history;
CREATE POLICY "Allow read for authenticated"
  ON public.budget_allocation_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.budget_allocation_history;
CREATE POLICY "Allow insert for authenticated"
  ON public.budget_allocation_history FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-bulletin-attachments', 'bid-bulletin-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Public read bid-bulletin-attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated upload bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated upload bid-bulletin-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated update bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated update bid-bulletin-attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bid-bulletin-attachments')
  WITH CHECK (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated delete bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated delete bid-bulletin-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bid-bulletin-attachments');

-- Public Bid Winners page (anon reads awarded requests + supplier names)
DROP POLICY IF EXISTS "Anon read requests with awarded supplier" ON public.requests;
CREATE POLICY "Anon read requests with awarded supplier"
  ON public.requests FOR SELECT TO anon
  USING (supplier_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon read suppliers referenced by awarded requests" ON public.suppliers;
CREATE POLICY "Anon read suppliers referenced by awarded requests"
  ON public.suppliers FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.supplier_id = suppliers.id AND r.supplier_id IS NOT NULL
    )
  );

NOTIFY pgrst, 'reload schema';
