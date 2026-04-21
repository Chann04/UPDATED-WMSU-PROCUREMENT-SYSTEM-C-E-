BEGIN;

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.request_chat_allowed(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND (
        r.status IN ('Rejected', 'ProcurementFailed')
        OR EXISTS (
          SELECT 1
          FROM public.request_integrity_events e
          WHERE e.request_id = r.id
            AND e.event_type = 'admin_edit'
        )
      )
  );
$$;

DROP POLICY IF EXISTS request_comments_select_policy ON public.request_comments;
CREATE POLICY request_comments_select_policy
  ON public.request_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.request_actor_can_manage(r.id)
        )
    )
  );

DROP POLICY IF EXISTS request_comments_insert_policy ON public.request_comments;
CREATE POLICY request_comments_insert_policy
  ON public.request_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.request_chat_allowed(request_id)
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.request_actor_can_manage(r.id)
        )
    )
  );

DROP POLICY IF EXISTS request_comments_update_none ON public.request_comments;
CREATE POLICY request_comments_update_none
  ON public.request_comments
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS request_comments_delete_none ON public.request_comments;
CREATE POLICY request_comments_delete_none
  ON public.request_comments
  FOR DELETE
  TO authenticated
  USING (false);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.request_comments;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
