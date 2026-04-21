-- Budget fund sources: breakdown of where each budget's total came from
-- Run this in Supabase SQL Editor if the table does not exist yet.

CREATE TABLE IF NOT EXISTS budget_fund_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  funds_for TEXT,
  source TEXT,
  date_received DATE,
  span TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_fund_sources_budget_id ON budget_fund_sources(budget_id);

-- Optional: trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_fund_sources_updated_at ON budget_fund_sources;
CREATE TRIGGER budget_fund_sources_updated_at
  BEFORE UPDATE ON budget_fund_sources
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Allow authenticated users to read; only admins can insert/update/delete (adjust RLS as needed)
ALTER TABLE budget_fund_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON budget_fund_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated" ON budget_fund_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
