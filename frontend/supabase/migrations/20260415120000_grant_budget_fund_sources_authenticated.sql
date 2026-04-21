-- Fix PostgREST "permission denied for table budget_fund_sources" (42501) for logged-in users.
-- RLS policies are not enough without GRANT; Supabase CLI-created tables sometimes omit these.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_fund_sources TO authenticated;
GRANT ALL ON TABLE public.budget_fund_sources TO service_role;

-- Budgets read/write used by faculty snapshot + admin (403 on /rest/v1/budgets if grants missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budgets TO authenticated;
GRANT ALL ON TABLE public.budgets TO service_role;
