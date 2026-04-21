## College-Department Integrity Rollout Checklist

### Pre-deploy
- Apply migrations in order, including:
  - `20260420120000_requisition_integrity.sql`
  - `20260420133000_requests_rls_and_atomic_workflow.sql`
- Verify RLS policy matrix manually for `Faculty`, `DeptHead`, and `Admin`.
- Confirm RPC permissions for authenticated users:
  - `request_submit_atomic`
  - `request_approve_with_reason_atomic`
  - `request_decline_with_reason_atomic`
  - `request_procurement_failed_with_reason_atomic`
  - `request_adjust_with_reason_atomic`

### Functional validation
- Faculty can create draft and submit own draft.
- Faculty cannot edit line-item payload after submit.
- DeptHead can approve/decline/procure only for handled college requests.
- Approve/decline/procurement-failed/edit actions fail without reason.
- Adjusting requisition writes integrity history and increments version.
- Integrity timeline is visible to both faculty and dept-head for same request.
- Completed statuses appear in `Procurement History`, not active request queue.

### Reconciliation checks
- For `ProcurementDone`, department can record received quantity.
- Variance (`received - ordered`) appears in procurement history.
- Partial delivery remarks are visible in variance column.

### Post-deploy monitoring
- Watch for DB errors containing:
  - `permission denied`
  - `Invalid request status transition`
  - `Reason is required`
- Confirm realtime updates are functioning on dept-head history pages.
- Validate that no orphaned transitions exist without integrity events.
