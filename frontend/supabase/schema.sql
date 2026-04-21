-- ============================================================
-- PROCUREMENT SYSTEM - Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (in order, or all at once)
-- ============================================================

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Faculty' CHECK (role IN ('Faculty', 'DeptHead', 'Admin')),
  department TEXT,
  approved_budget NUMERIC(12, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow insert for authenticated" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: create profile on signup (uses auth.jwt() ->> 'user_metadata')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. COLLEGES
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  handler_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  allocation_mode TEXT NOT NULL DEFAULT 'percentage' CHECK (allocation_mode IN ('percentage', 'amount')),
  allocation_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON colleges(is_active);

CREATE OR REPLACE FUNCTION colleges_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS colleges_updated_at_trigger ON colleges;
CREATE TRIGGER colleges_updated_at_trigger
  BEFORE UPDATE ON colleges
  FOR EACH ROW EXECUTE PROCEDURE colleges_set_updated_at();

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON colleges FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE colleges TO authenticated;
GRANT ALL ON TABLE colleges TO service_role;

INSERT INTO colleges (name, allocation_mode, allocation_value)
VALUES
  ('College of Computing Science', 'percentage', 33.33),
  ('College of Nursing', 'percentage', 33.33),
  ('College of Engineering', 'percentage', 33.34)
ON CONFLICT (name) DO NOTHING;
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. VENDORS (Suppliers)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_academic_year ON budgets(academic_year);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: set remaining_amount = total_amount - spent_amount
CREATE OR REPLACE FUNCTION set_budget_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount = NEW.total_amount - NEW.spent_amount;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budgets_remaining_trigger ON budgets;
CREATE TRIGGER budgets_remaining_trigger
  BEFORE INSERT OR UPDATE ON budgets
  FOR EACH ROW EXECUTE PROCEDURE set_budget_remaining();

-- ============================================================
-- 6. REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Pending', 'Approved', 'Rejected', 'ProcurementFailed', 'Procuring', 'ProcurementDone', 'Received', 'Completed'
  )),
  rejection_reason TEXT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delegated_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delegated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delegated_at TIMESTAMPTZ,
  quotation_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. REQUEST COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request ON request_comments(request_id);

ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON request_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. REQUEST ACTIVITY
-- ============================================================
CREATE TABLE IF NOT EXISTS request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'delegated', 'comment_added')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_activity_request ON request_activity(request_id);

ALTER TABLE request_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON request_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. BUDGET FUND SOURCES (where budget funds came from)
-- ============================================================
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

ALTER TABLE budget_fund_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON budget_fund_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON budget_fund_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Optional: function used by app (get_user_role)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
