-- Live updates for faculty Request & History when college approves (postgres_changes subscription).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
  END IF;
END $$;
