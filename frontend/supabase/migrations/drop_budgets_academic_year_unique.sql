-- Allow duplicate academic years in budgets (each addition is listed as history).
-- Run this in Supabase SQL Editor if you get: duplicate key value violates unique constraint "budgets_academic_year_key"

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_academic_year_key;
