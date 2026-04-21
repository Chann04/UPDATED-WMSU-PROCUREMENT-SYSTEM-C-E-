-- Add approved_budget to profiles (amount approved for faculty; shown on their dashboard)
-- Run in Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approved_budget NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN profiles.approved_budget IS 'Budget amount approved for this user (Faculty). Shown as "Your approved budget" on their dashboard.';
