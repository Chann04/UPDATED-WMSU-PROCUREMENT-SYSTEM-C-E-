/**
 * Procurement request types – aligned with frontend (database).
 */
export type RequestStatus =
  | 'Draft'
  | 'Pending'
  | 'Negotiating'
  | 'Approved'
  | 'Rejected'
  | 'ProcurementFailed'
  | 'Ordered'
  | 'Procuring'
  | 'ProcurementDone'
  | 'Received'
  | 'Completed';

export interface Request {
  id: string;
  requester_id: string;
  category_id: string | null;
  supplier_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: RequestStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestWithRelations extends Request {
  requester?: { full_name?: string; email?: string };
  category?: { name?: string };
  supplier?: { name?: string };
}
