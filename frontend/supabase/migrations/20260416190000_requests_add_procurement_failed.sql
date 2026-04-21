-- Add ProcurementFailed as a valid terminal request status.
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

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check CHECK (status IN (
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'ProcurementFailed',
    'Procuring',
    'ProcurementDone',
    'Received',
    'Completed'
  ));
