-- =============================================================================
-- Procurement tables: budgets, requests stack, request_activity (audit log)
-- Run in Supabase → SQL Editor (fixes missing tables / schema cache errors)
--
-- Requires: public.profiles (run FIX_SUPABASE_profiles_login.sql first if needed)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Table public.profiles is missing. Run frontend/supabase/FIX_SUPABASE_profiles_login.sql first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- categories (requests.category_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.categories;
CREATE POLICY "Allow all for authenticated"
  ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

-- ---------------------------------------------------------------------------
-- suppliers (requests.supplier_id, bid_winner_supplier_id) — matches app TypeScript
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Qualified', 'Disqualified')),
  contact_first_name TEXT,
  contact_middle_name TEXT,
  contact_last_name TEXT,
  tin_number TEXT,
  business_registration_no TEXT,
  business_type TEXT,
  portfolio_url TEXT,
  project_attending TEXT,
  portfolio_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.suppliers;
CREATE POLICY "Allow all for authenticated"
  ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;

-- ---------------------------------------------------------------------------
-- budgets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_academic_year ON public.budgets(academic_year);

CREATE OR REPLACE FUNCTION public.set_budget_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount = NEW.total_amount - COALESCE(NEW.spent_amount, 0);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budgets_remaining_trigger ON public.budgets;
CREATE TRIGGER budgets_remaining_trigger
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_budget_remaining();

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.budgets;
CREATE POLICY "Allow all for authenticated"
  ON public.budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.budgets TO authenticated;
GRANT ALL ON TABLE public.budgets TO service_role;

-- ---------------------------------------------------------------------------
-- requests (matches frontend/src/types/database.ts + supabaseApi requestsAPI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Pending', 'Approved', 'Rejected', 'ProcurementFailed', 'Procuring', 'ProcurementDone', 'Received', 'Completed'
  )),
  rejection_reason TEXT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delegated_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  delegated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  delegated_at TIMESTAMPTZ,
  quotation_url TEXT,
  bid_winner_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  delivery_notes TEXT,
  delivery_attachment_url TEXT,
  negotiating_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);

CREATE OR REPLACE FUNCTION public.set_request_total_price()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := COALESCE(NEW.quantity, 1) * COALESCE(NEW.unit_price, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS requests_total_price_trigger ON public.requests;
CREATE TRIGGER requests_total_price_trigger
  BEFORE INSERT OR UPDATE OF quantity, unit_price ON public.requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_request_total_price();

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.requests;
CREATE POLICY "Allow all for authenticated"
  ON public.requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.requests TO authenticated;
GRANT ALL ON TABLE public.requests TO service_role;

-- ---------------------------------------------------------------------------
-- request_comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request ON public.request_comments(request_id);

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.request_comments;
CREATE POLICY "Allow all for authenticated"
  ON public.request_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.request_comments TO authenticated;
GRANT ALL ON TABLE public.request_comments TO service_role;

-- ---------------------------------------------------------------------------
-- request_activity (audit log / Logs page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'delegated', 'comment_added')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_activity_request ON public.request_activity(request_id);

ALTER TABLE public.request_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.request_activity;
CREATE POLICY "Allow all for authenticated"
  ON public.request_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.request_activity TO authenticated;
GRANT ALL ON TABLE public.request_activity TO service_role;

-- Hint PostgREST to pick up new tables (Supabase)
NOTIFY pgrst, 'reload schema';
