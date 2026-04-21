BEGIN;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS requisition_payload jsonb;

CREATE OR REPLACE FUNCTION public.compute_request_integrity_hash_v2(
  p_item_name text,
  p_description text,
  p_requisition_payload jsonb,
  p_quantity numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_budget_fund_source_id uuid,
  p_college_budget_type_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      coalesce(trim(p_item_name), '') || '|' ||
      coalesce(trim(p_description), '') || '|' ||
      coalesce(p_requisition_payload::text, '{}') || '|' ||
      coalesce(p_quantity::text, '0') || '|' ||
      coalesce(p_unit_price::text, '0') || '|' ||
      coalesce(p_total_price::text, '0') || '|' ||
      coalesce(p_budget_fund_source_id::text, '') || '|' ||
      coalesce(p_college_budget_type_id::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.request_actor_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.request_actor_can_manage(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, role
    FROM public.profiles
    WHERE id = auth.uid()
  ),
  req AS (
    SELECT r.id, r.requester_id, rp.department AS requester_college
    FROM public.requests r
    LEFT JOIN public.profiles rp ON rp.id = r.requester_id
    WHERE r.id = p_request_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM me, req
    WHERE
      me.role = 'Admin'
      OR (
        me.role = 'DeptHead'
        AND EXISTS (
          SELECT 1
          FROM public.colleges c
          WHERE c.handler_id = me.id
            AND c.name = req.requester_college
        )
      )
  );
$$;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.requests', p.policyname);
  END LOOP;
END $$;

CREATE POLICY requests_select_policy
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.request_actor_can_manage(id)
  );

CREATE POLICY requests_insert_faculty_draft
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'Faculty'
    )
    AND coalesce(status, 'Draft') = 'Draft'
  );

CREATE POLICY requests_update_requester_limited
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (
    requester_id = auth.uid()
    AND (
      status IN ('Draft', 'Pending', 'Received')
    )
  );

CREATE POLICY requests_update_manager_policy
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (public.request_actor_can_manage(id))
  WITH CHECK (public.request_actor_can_manage(id));

CREATE POLICY requests_delete_requester_draft_only
  ON public.requests
  FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid()
    AND status = 'Draft'
  );

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_integrity_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.request_integrity_events', p.policyname);
  END LOOP;
END $$;

CREATE POLICY request_integrity_events_read_policy
  ON public.request_integrity_events
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

CREATE POLICY request_integrity_events_insert_service_only
  ON public.request_integrity_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_request_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'Draft' AND NEW.status = 'Pending' THEN RETURN NEW; END IF;
  IF OLD.status = 'Pending' AND NEW.status IN ('Approved', 'Rejected') THEN RETURN NEW; END IF;
  IF OLD.status = 'Approved' AND NEW.status IN ('Procuring', 'Rejected') THEN RETURN NEW; END IF;
  IF OLD.status = 'Procuring' AND NEW.status IN ('ProcurementDone', 'ProcurementFailed') THEN RETURN NEW; END IF;
  IF OLD.status = 'ProcurementDone' AND NEW.status = 'Received' THEN RETURN NEW; END IF;
  IF OLD.status = 'Received' AND NEW.status = 'Completed' THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Invalid request status transition: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_status_transitions ON public.requests;
CREATE TRIGGER trg_enforce_request_status_transitions
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_status_transitions();

CREATE OR REPLACE FUNCTION public.request_submit_atomic(p_request_id uuid)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_hash text;
BEGIN
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF v_req.status <> 'Draft' THEN RAISE EXCEPTION 'Only Draft requests can be submitted.'; END IF;

  v_hash := public.compute_request_integrity_hash_v2(
    v_req.item_name,
    v_req.description,
    v_req.requisition_payload,
    v_req.quantity,
    v_req.unit_price,
    v_req.total_price,
    v_req.budget_fund_source_id,
    v_req.college_budget_type_id
  );

  UPDATE public.requests
     SET status = 'Pending',
         submitted_payload_hash = coalesce(submitted_payload_hash, v_hash),
         latest_payload_hash = v_hash,
         last_integrity_reason = 'Requester submitted requisition.',
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'submit_locked', auth.uid(), 'Requester submitted requisition.',
    jsonb_build_object('status', 'Draft'),
    jsonb_build_object('status', 'Pending'),
    v_hash,
    v_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_approve_with_reason_atomic(
  p_request_id uuid,
  p_reason text,
  p_college_budget_type_id uuid DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_from_status text;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Pending' THEN RAISE EXCEPTION 'Only Pending requests can be approved.'; END IF;

  UPDATE public.requests
     SET status = 'Approved',
         approved_by = auth.uid(),
         approved_at = now(),
         college_budget_type_id = p_college_budget_type_id,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'approved_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', 'Pending'),
    jsonb_build_object('status', 'Approved'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_decline_with_reason_atomic(
  p_request_id uuid,
  p_reason text
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_from_status text;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status NOT IN ('Pending', 'Approved') THEN RAISE EXCEPTION 'Request cannot be declined in this status.'; END IF;

  v_from_status := v_req.status;

  UPDATE public.requests
     SET status = 'Rejected',
         rejection_reason = trim(p_reason),
         approved_by = auth.uid(),
         approved_at = now(),
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'declined_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', v_from_status),
    jsonb_build_object('status', 'Rejected'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_procurement_failed_with_reason_atomic(
  p_request_id uuid,
  p_reason text
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Procuring' THEN RAISE EXCEPTION 'Only Procuring requests can be marked failed.'; END IF;

  UPDATE public.requests
     SET status = 'ProcurementFailed',
         rejection_reason = trim(p_reason),
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'procurement_failed_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', 'Procuring'),
    jsonb_build_object('status', 'ProcurementFailed'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_adjust_with_reason_atomic(
  p_request_id uuid,
  p_description text,
  p_requisition_payload jsonb,
  p_quantity integer,
  p_unit_price numeric,
  p_reason text,
  p_status text DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.requests;
  v_after public.requests;
  v_hash_before text;
  v_hash_after text;
  v_total numeric;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero.'; END IF;
  IF p_unit_price < 0 THEN RAISE EXCEPTION 'Unit price cannot be negative.'; END IF;

  SELECT * INTO v_before FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

  v_total := round((p_quantity::numeric * p_unit_price)::numeric, 2);
  v_hash_before := coalesce(v_before.latest_payload_hash, public.compute_request_integrity_hash_v2(
    v_before.item_name, v_before.description, v_before.requisition_payload, v_before.quantity, v_before.unit_price, v_before.total_price,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  ));
  v_hash_after := public.compute_request_integrity_hash_v2(
    v_before.item_name, p_description, p_requisition_payload, p_quantity, p_unit_price, v_total,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  );

  UPDATE public.requests
     SET description = p_description,
         requisition_payload = coalesce(p_requisition_payload, requisition_payload),
         quantity = p_quantity,
         unit_price = p_unit_price,
         total_price = v_total,
         status = coalesce(p_status, status),
         latest_payload_hash = v_hash_after,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_after;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'admin_edit', auth.uid(), trim(p_reason),
    jsonb_build_object(
      'description', v_before.description,
      'quantity', v_before.quantity,
      'unit_price', v_before.unit_price,
      'total_price', v_before.total_price,
      'status', v_before.status
    ),
    jsonb_build_object(
      'description', v_after.description,
      'quantity', v_after.quantity,
      'unit_price', v_after.unit_price,
      'total_price', v_after.total_price,
      'status', v_after.status
    ),
    v_hash_before,
    v_hash_after
  );

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.request_submit_atomic(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_approve_with_reason_atomic(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_decline_with_reason_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_procurement_failed_with_reason_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_adjust_with_reason_atomic(uuid, text, jsonb, integer, numeric, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_submit_atomic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_approve_with_reason_atomic(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_decline_with_reason_atomic(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_procurement_failed_with_reason_atomic(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_adjust_with_reason_atomic(uuid, text, jsonb, integer, numeric, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
