-- College procurement workflow (Procuring, ProcurementDone) and final allowed request statuses.
-- Drop any existing CHECK on requests whose definition references status (name varies by migration).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Normalize removed statuses before the new CHECK is applied
UPDATE public.requests SET status = 'Pending' WHERE status = 'Negotiating';
UPDATE public.requests SET status = 'Procuring' WHERE status = 'Ordered';

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check CHECK (status IN (
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'Procuring',
    'ProcurementDone',
    'Received',
    'Completed'
  ));
