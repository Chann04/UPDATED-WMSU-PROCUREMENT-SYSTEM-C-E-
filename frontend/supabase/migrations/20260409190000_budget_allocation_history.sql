-- ============================================================
-- Budget allocation history (session-safe, append-only deltas)
-- ============================================================

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

NOTIFY pgrst, 'reload schema';
