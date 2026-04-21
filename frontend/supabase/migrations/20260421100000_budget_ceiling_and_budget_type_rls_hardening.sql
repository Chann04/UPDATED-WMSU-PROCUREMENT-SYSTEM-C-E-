BEGIN;

-- -----------------------------------------------------
-- Helpers: college + budget ceiling checks for requests
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_request_requester_college_id(p_request_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.requests r
  JOIN public.profiles rp ON rp.id = r.requester_id
  JOIN public.colleges c ON c.name = rp.department
  WHERE r.id = p_request_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_college_committed_total(p_college_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(r.total_price), 0)
  FROM public.requests r
  JOIN public.profiles rp ON rp.id = r.requester_id
  JOIN public.colleges c ON c.name = rp.department
  WHERE c.id = p_college_id
    AND r.status IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed');
$$;

CREATE OR REPLACE FUNCTION public.get_budget_type_committed_total(p_budget_type_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(total_price), 0)
  FROM public.requests
  WHERE college_budget_type_id = p_budget_type_id
    AND status IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed');
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_budget_ceiling(
  p_request_id uuid,
  p_target_total numeric,
  p_target_budget_type_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_college_id uuid;
  v_college_name text;
  v_request_total numeric;
  v_existing_type_id uuid;
  v_effective_type_id uuid;
  v_college_ceiling numeric;
  v_college_committed numeric;
  v_college_remaining numeric;
  v_type_amount numeric;
  v_type_name text;
  v_type_college_id uuid;
  v_type_is_active boolean;
  v_type_committed numeric;
  v_type_remaining numeric;
BEGIN
  IF p_target_total < 0 THEN
    RAISE EXCEPTION 'Budget check failed: target total cannot be negative.';
  END IF;

  SELECT r.total_price, r.college_budget_type_id, c.id, c.name
    INTO v_request_total, v_existing_type_id, v_college_id, v_college_name
  FROM public.requests r
  LEFT JOIN public.profiles rp ON rp.id = r.requester_id
  LEFT JOIN public.colleges c ON c.name = rp.department
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF v_college_id IS NULL THEN
    -- Keep backward compatibility for legacy rows with no resolvable college mapping.
    RETURN;
  END IF;

  SELECT p.approved_budget
    INTO v_college_ceiling
  FROM public.colleges c
  LEFT JOIN public.profiles p ON p.id = c.handler_id
  WHERE c.id = v_college_id;

  v_college_committed := public.get_college_committed_total(v_college_id);
  v_college_remaining := greatest(0, coalesce(v_college_ceiling, 0) - (v_college_committed - coalesce(v_request_total, 0)));

  IF coalesce(v_college_ceiling, 0) > 0 AND p_target_total > v_college_remaining THEN
    RAISE EXCEPTION
      'Budget ceiling exceeded for college "%": request total % is above remaining %.',
      coalesce(v_college_name, 'Unknown'),
      p_target_total,
      v_college_remaining;
  END IF;

  v_effective_type_id := coalesce(p_target_budget_type_id, v_existing_type_id);
  IF v_effective_type_id IS NULL THEN
    RETURN;
  END IF;

  SELECT t.amount, t.name, t.college_id, t.is_active
    INTO v_type_amount, v_type_name, v_type_college_id, v_type_is_active
  FROM public.college_budget_types t
  WHERE t.id = v_effective_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected budget type is no longer available.';
  END IF;
  IF v_type_college_id <> v_college_id THEN
    RAISE EXCEPTION 'Budget type does not belong to requester college.';
  END IF;
  IF coalesce(v_type_is_active, false) = false THEN
    RAISE EXCEPTION 'Selected budget type is inactive.';
  END IF;

  v_type_committed := public.get_budget_type_committed_total(v_effective_type_id);
  v_type_remaining := greatest(0, coalesce(v_type_amount, 0) - (v_type_committed - coalesce(v_request_total, 0)));

  IF p_target_total > v_type_remaining THEN
    RAISE EXCEPTION
      'Budget ceiling exceeded for type "%": request total % is above remaining %.',
      coalesce(v_type_name, 'Unknown'),
      p_target_total,
      v_type_remaining;
  END IF;
END;
$$;

-- -----------------------------------------------------
-- Harden atomic workflow functions with budget checks
-- -----------------------------------------------------
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
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Pending' THEN RAISE EXCEPTION 'Only Pending requests can be approved.'; END IF;

  PERFORM public.enforce_request_budget_ceiling(
    p_request_id,
    coalesce(v_req.total_price, 0),
    p_college_budget_type_id
  );

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

  IF coalesce(p_status, v_before.status) IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed') THEN
    PERFORM public.enforce_request_budget_ceiling(
      p_request_id,
      v_total,
      v_before.college_budget_type_id
    );
  END IF;

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

-- -----------------------------------------------------
-- Tighten college_budget_types RLS (no global write)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_college_budget_type(p_college_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND (
        me.role = 'Admin'
        OR (
          me.role = 'DeptHead'
          AND EXISTS (
            SELECT 1
            FROM public.colleges c
            WHERE c.id = p_college_id
              AND c.handler_id = me.id
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.college_budget_types;

CREATE POLICY college_budget_types_read_authenticated
ON public.college_budget_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY college_budget_types_insert_managers
ON public.college_budget_types
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_college_budget_type(college_id));

CREATE POLICY college_budget_types_update_managers
ON public.college_budget_types
FOR UPDATE
TO authenticated
USING (public.can_manage_college_budget_type(college_id))
WITH CHECK (public.can_manage_college_budget_type(college_id));

CREATE POLICY college_budget_types_delete_managers
ON public.college_budget_types
FOR DELETE
TO authenticated
USING (public.can_manage_college_budget_type(college_id));

NOTIFY pgrst, 'reload schema';

COMMIT;
