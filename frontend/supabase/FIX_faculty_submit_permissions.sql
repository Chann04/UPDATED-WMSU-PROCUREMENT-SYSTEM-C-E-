-- =====================================================================
-- FIX: "permission denied for table budget_fund_sources" (42501)
-- and related errors when a Faculty / Department Head submits a draft.
--
-- Context:
--   The faculty "New Request" + "Submit draft" flows call
--   procurementBudgetAPI.getFacultySnapshot(), which reads from several
--   tables. Supabase RLS policies are *not* sufficient on their own —
--   PostgREST also requires table-level GRANTs for the `authenticated`
--   role. A fresh Supabase project created from bare DDL will often be
--   missing these grants, producing 401/403 and
--   "permission denied for table <name>" errors in the client.
--
-- Run this entire script once in the Supabase SQL Editor (or psql) of
-- the project you're currently pointing VITE_SUPABASE_URL at.
-- =====================================================================

-- Budget fund sources (primary culprit of the current error)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_fund_sources TO authenticated;
GRANT ALL                               ON TABLE public.budget_fund_sources TO service_role;

-- Budgets (read by getCurrentYearBudgets)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budgets TO authenticated;
GRANT ALL                               ON TABLE public.budgets TO service_role;

-- Colleges (read by collegesAPI.getAll for college matching)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.colleges TO authenticated;
GRANT ALL                               ON TABLE public.colleges TO service_role;

-- College budget types (read by collegeBudgetTypesAPI.getByCollegeId)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.college_budget_types TO authenticated;
GRANT ALL                               ON TABLE public.college_budget_types TO service_role;

-- Requests (read by requestsAPI.getByRequesterIds; inserted on Create/Send)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requests TO authenticated;
GRANT ALL                               ON TABLE public.requests TO service_role;

-- Profiles (read by authAPI.getProfile and profilesAPI.getById)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT ALL                               ON TABLE public.profiles TO service_role;

-- Make sure PostgREST knows about any new schema elements
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- Quick sanity checks — the SELECTs below should now return without 42501:
--   SELECT count(*) FROM public.budget_fund_sources;
--   SELECT count(*) FROM public.budgets;
--   SELECT count(*) FROM public.colleges;
--   SELECT count(*) FROM public.college_budget_types;
--   SELECT count(*) FROM public.requests;
-- =====================================================================
