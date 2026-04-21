-- ============================================================
-- Transparency seal entries, bid bulletins, storage, public read
-- Run in Supabase SQL Editor after prior migrations (landing_page, etc.)
-- ============================================================

-- -----------------------------------------------------------------
-- 1. transparency_seal_entries (Active Bidding / featured items)
-- -----------------------------------------------------------------
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
  ON public.transparency_seal_entries FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated manage transparency_seal_entries" ON public.transparency_seal_entries;
CREATE POLICY "Authenticated manage transparency_seal_entries"
  ON public.transparency_seal_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------
-- 2. bid_bulletins
-- -----------------------------------------------------------------
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
  ON public.bid_bulletins FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated manage bid_bulletins" ON public.bid_bulletins;
CREATE POLICY "Authenticated manage bid_bulletins"
  ON public.bid_bulletins FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------
-- 3. Public storage bucket for bulletin file attachments
-- -----------------------------------------------------------------
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

-- -----------------------------------------------------------------
-- 4. Public read for Bid Winners page (anon): awarded requests + supplier names
-- -----------------------------------------------------------------
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
