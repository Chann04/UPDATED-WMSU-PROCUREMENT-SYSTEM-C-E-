-- Doc-aligned features: budget-linked requests, partial delivery (ICS / custodian handled in app; no separate supply_entries table)
--
-- Prerequisite: budget_fund_sources must exist (included below if missing — same as 20250224000000_budget_fund_sources.sql)

CREATE TABLE IF NOT EXISTS public.budget_fund_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  funds_for TEXT,
  source TEXT,
  date_received DATE,
  span TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_fund_sources_budget_id ON public.budget_fund_sources(budget_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_fund_sources_updated_at ON public.budget_fund_sources;
CREATE TRIGGER budget_fund_sources_updated_at
  BEFORE UPDATE ON public.budget_fund_sources
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.budget_fund_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_fund_sources;
CREATE POLICY "Allow read for authenticated" ON public.budget_fund_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.budget_fund_sources;
CREATE POLICY "Allow all for authenticated" ON public.budget_fund_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Requests: link to university fund source + college unit allotment; receiving variance
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS budget_fund_source_id uuid REFERENCES public.budget_fund_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS college_budget_type_id uuid REFERENCES public.college_budget_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_received numeric(14, 4),
  ADD COLUMN IF NOT EXISTS partial_delivery_remarks text;

CREATE INDEX IF NOT EXISTS idx_requests_budget_fund_source_id ON public.requests(budget_fund_source_id);
CREATE INDEX IF NOT EXISTS idx_requests_college_budget_type_id ON public.requests(college_budget_type_id);

COMMENT ON COLUMN public.requests.budget_fund_source_id IS 'Layer 1 funding stream (university budget breakdown)';
COMMENT ON COLUMN public.requests.college_budget_type_id IS 'Layer 3 unit / sub-category allotment within college';
COMMENT ON COLUMN public.requests.quantity_received IS 'Actual quantity received (logistics); may differ from quantity';
COMMENT ON COLUMN public.requests.partial_delivery_remarks IS 'Required when quantity_received < quantity';

NOTIFY pgrst, 'reload schema';
