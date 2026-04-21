import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MessageSquareWarning, Printer, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CommentWithAuthor, IntegrityEventWithActor, Request, RequestWithRelations } from '../types/database';
import {
  parseRequisitionDescription,
  serializeStructuredRequisition,
  type ParsedRequisitionItem,
  type ParsedRequisitionStructured,
  type ParsedSignatory,
} from '../lib/parseRequisitionDescription';
import RequisitionDocumentView from './RequisitionDocumentView';
import { useAuth } from '../context/AuthContext';
import { collegeBudgetTypesAPI, collegesAPI, commentsAPI, integrityAPI, requestsAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import { requestAllowsChat } from '../lib/chatPolicy';

type Props = {
  request: RequestWithRelations | null;
  onClose: () => void;
  onRecorded?: () => void;
};

const peso = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function RequisitionViewModal({ request, onClose, onRecorded }: Props) {
  const { profile, isDeptHead, isFaculty } = useAuth();
  const [myCollege, setMyCollege] = useState<{ id: string; name: string } | null>(null);
  const [qtyReceived, setQtyReceived] = useState('');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [budgetTypes, setBudgetTypes] = useState<Awaited<ReturnType<typeof collegeBudgetTypesAPI.getByCollegeId>>>([]);
  const [budgetTypeRemaining, setBudgetTypeRemaining] = useState<Record<string, number>>({});
  const [loadingBudgetTypes, setLoadingBudgetTypes] = useState(false);
  const [approveBudgetTypeId, setApproveBudgetTypeId] = useState('');
  const [collegeRemaining, setCollegeRemaining] = useState<number | null>(null);
  const [approveReason, setApproveReason] = useState('');
  const [approveEditedConfirm, setApproveEditedConfirm] = useState(false);
  const [approveModalError, setApproveModalError] = useState('');
  const [approveModalLoading, setApproveModalLoading] = useState(false);

  const [adjustEditMode, setAdjustEditMode] = useState(false);
  const [adjustItems, setAdjustItems] = useState<ParsedRequisitionItem[]>([]);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBudgetTypeId, setAdjustBudgetTypeId] = useState('');
  const [integrityRows, setIntegrityRows] = useState<IntegrityEventWithActor[]>([]);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  /** College admin edits to Received by; cleared when switching requests. */
  const [receivedByOverride, setReceivedByOverride] = useState<ParsedSignatory | null>(null);

  const [declineReason, setDeclineReason] = useState('');
  const [procurementFailedReason, setProcurementFailedReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentFile, setCommentFile] = useState<File | null>(null);

  const parsed = useMemo(
    () => (request ? parseRequisitionDescription(request.description) : null),
    [request?.description, request?.id]
  );

  const structuredParsed = parsed?.kind === 'structured' ? parsed : null;

  useEffect(() => {
    if (!profile?.id || !isDeptHead()) {
      setMyCollege(null);
      return;
    }
    let cancelled = false;
    void collegesAPI.getAll().then((cols) => {
      if (cancelled) return;
      const c = cols.find((x) => x.handler_id === profile.id);
      setMyCollege(c ? { id: c.id, name: c.name } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, isDeptHead]);

  useEffect(() => {
    if ((!showApproveModal && !adjustEditMode) || !myCollege?.id) return;
    let cancelled = false;
    setLoadingBudgetTypes(true);
    setBudgetTypeRemaining({});
    void collegeBudgetTypesAPI.getByCollegeId(myCollege.id).then((rows) => {
      if (!cancelled) setBudgetTypes(rows.filter((t) => t.is_active));
    }).finally(() => {
      if (!cancelled) setLoadingBudgetTypes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showApproveModal, adjustEditMode, myCollege?.id]);

  useEffect(() => {
    if ((!showApproveModal && !adjustEditMode) || budgetTypes.length === 0) return;
    let cancelled = false;
    void Promise.all(
      budgetTypes.map(async (t) => {
        const cap = Number(t.amount || 0);
        const used = await requestsAPI.sumCommittedTotalForBudgetType(t.id);
        return [t.id, Math.max(0, cap - used)] as const;
      })
    ).then((pairs) => {
      if (cancelled) return;
      setBudgetTypeRemaining(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [showApproveModal, adjustEditMode, budgetTypes]);

  useEffect(() => {
    if (!profile?.id || !isDeptHead()) {
      setCollegeRemaining(null);
      return;
    }
    if (!showApproveModal && !adjustEditMode) return;
    let cancelled = false;
    void requestsAPI.getForHandledCollege(profile.id).then(({ requests }) => {
      if (cancelled) return;
      const committed = requests
        .filter((r) => ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'].includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
      const ceiling = Number(profile.approved_budget || 0);
      setCollegeRemaining(Math.max(0, ceiling - committed));
    }).catch(() => {
      if (!cancelled) setCollegeRemaining(null);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.approved_budget, isDeptHead, showApproveModal, adjustEditMode]);

  useEffect(() => {
    if (!request) return;
    // Only hard-reset modal/action state when switching to a different request.
    // Edited requisition updates can change quantity on the same request and
    // should not wipe budget-type selection while the approve modal is open.
    setQtyReceived(String(request.quantity ?? ''));
    setDeliveryRemarks(request.partial_delivery_remarks || '');
    setDeliveryError('');
    setDeclineReason('');
    setActionError('');
    setAdjustEditMode(false);
    setAdjustItems([]);
    setAdjustReason('');
    setAdjustBudgetTypeId('');
    setReceivedByOverride(null);
    setShowApproveModal(false);
    setApproveBudgetTypeId('');
    setApproveReason('');
    setApproveEditedConfirm(false);
    setApproveModalError('');
    setProcurementFailedReason('');
  }, [request?.id]);

  useEffect(() => {
    if (!request?.id) {
      setIntegrityRows([]);
      setIntegrityLoading(false);
      return;
    }
    let cancelled = false;
    setIntegrityLoading(true);
    void integrityAPI.getTimelineByRequestId(request.id)
      .then((rows) => {
        if (!cancelled) setIntegrityRows(rows);
      })
      .catch(() => {
        if (!cancelled) setIntegrityRows([]);
      })
      .finally(() => {
        if (!cancelled) setIntegrityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request?.id]);

  useEffect(() => {
    if (!request?.id) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    let cancelled = false;
    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const rows = await commentsAPI.getByRequestId(request.id);
        if (!cancelled) setComments(rows);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    };
    void loadComments();

    const channel = supabase
      .channel(`request-comments-${request.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_comments',
          filter: `request_id=eq.${request.id}`,
        },
        () => {
          void loadComments();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [request?.id]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showApproveModal) {
        e.stopPropagation();
        setShowApproveModal(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, onClose, showApproveModal]);

  const isOwnFacultyRequest = !!request && !!profile?.id && request.requester_id === profile.id;
  const showDeliveryForm =
    !!request &&
    isFaculty() &&
    isOwnFacultyRequest &&
    request.status === 'ProcurementDone';

  const showApprovalBar =
    !!request && isDeptHead() && !!myCollege && request.status === 'Pending' && !adjustEditMode;

  const showProcurementActionBar =
    !!request &&
    isDeptHead() &&
    !!myCollege &&
    ['Approved', 'Procuring'].includes(request.status) &&
    !adjustEditMode;

  const openApproveModal = () => {
    setApproveModalError('');
    setApproveBudgetTypeId('');
    setApproveReason('');
    setApproveEditedConfirm(false);
    setShowApproveModal(true);
  };

  const hasPriorAdminEdits = useMemo(
    () => integrityRows.some((row) => row.event_type === 'admin_edit'),
    [integrityRows]
  );
  const chatAllowed = useMemo(() => {
    if (!request) return false;
    return requestAllowsChat(
      request.status,
      integrityRows.some((row) => row.event_type === 'admin_edit')
    );
  }, [request?.status, request?.id, integrityRows]);

  const confirmApprove = async () => {
    if (!request) return;
    const active = budgetTypes;
    if (active.length > 0 && !approveBudgetTypeId.trim()) {
      setApproveModalError('Select a budget type for this approval.');
      return;
    }
    const tid = approveBudgetTypeId.trim();
    let selectedType: (typeof active)[number] | undefined;
    if (tid) {
      selectedType = active.find((t) => t.id === tid);
      if (!selectedType) {
        setApproveModalError('Selected budget type is no longer available. Refresh and try again.');
        return;
      }
    }
    const reason = approveReason.trim();
    if (!reason) {
      setApproveModalError('Provide an approval reason so the department can see why this was approved.');
      return;
    }
    if (hasPriorAdminEdits && !approveEditedConfirm) {
      setApproveModalError('Confirm that you reviewed previous admin edits before approval.');
      return;
    }
    setApproveModalError('');
    setApproveModalLoading(true);
    try {
      if (tid && selectedType) {
        const cap = Number(selectedType.amount || 0);
        const used = await requestsAPI.sumCommittedTotalForBudgetType(tid);
        const remaining = Math.max(0, cap - used);
        const cost = Number(request.total_price || 0);
        const costCents = Math.round(cost * 100);
        const remainingCents = Math.round(remaining * 100);
        if (costCents > remainingCents) {
          setApproveModalError(
            `This request total (${peso(cost)}) exceeds what is left for "${selectedType.name}" (${peso(remaining)} remaining of ${peso(cap)} allocated). Choose another type, reduce the request, or increase the allocation.`
          );
          return;
        }
      }
      const updates: Partial<Request> = {
        college_budget_type_id: tid || null,
      };
      let adjustedStructuredPayload: ParsedRequisitionStructured | null = null;
      if (structuredParsed) {
        adjustedStructuredPayload = {
          ...structuredParsed,
          signatories: {
            ...structuredParsed.signatories,
            receivedBy: receivedByOverride ?? structuredParsed.signatories.receivedBy,
          },
        };
        updates.description = serializeStructuredRequisition(adjustedStructuredPayload);
      }
      if (updates.description && updates.description !== request.description) {
        await integrityAPI.saveAdjustedWithReason({
          requestId: request.id,
          reason,
          beforeRequest: request,
          afterPatch: updates,
          requisitionPayload: adjustedStructuredPayload,
          beforePayload: { description: request.description },
          afterPayload: { description: updates.description },
        });
      }
      await requestsAPI.approveWithReason(request.id, reason, tid || null);
      setShowApproveModal(false);
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setApproveModalError(e?.message || 'Could not approve.');
    } finally {
      setApproveModalLoading(false);
    }
  };

  const startAdjust = () => {
    if (!structuredParsed) {
      setActionError('This requisition cannot be edited (not in structured form).');
      return;
    }
    setActionError('');
    setAdjustEditMode(true);
    setAdjustBudgetTypeId(request?.college_budget_type_id || '');
    setAdjustItems(structuredParsed.items.map((it, i) => ({ ...it, lineNo: i + 1 })));
  };

  const cancelAdjust = () => {
    setAdjustEditMode(false);
    setAdjustItems([]);
    setAdjustReason('');
    setAdjustBudgetTypeId('');
    setActionError('');
  };

  const saveAdjustAsApproved = async () => {
    if (!request || !structuredParsed) return;
    const reason = adjustReason.trim();
    if (!reason) {
      setActionError('Provide a reason for editing this requisition so the department can see why it was changed.');
      return;
    }
    const valid = adjustItems.filter((l) => l.item.trim() && l.qty > 0);
    if (valid.length === 0) {
      setActionError('Keep at least one line with item description and quantity.');
      return;
    }
    const tid = adjustBudgetTypeId.trim();
    let selectedType: (typeof budgetTypes)[number] | undefined;
    if (request.status === 'Pending') {
      if (!tid) {
        setActionError('Select a budget type before saving this edited request as approved.');
        return;
      }
      selectedType = budgetTypes.find((t) => t.id === tid);
      if (!selectedType) {
        setActionError('Selected budget type is no longer available. Refresh and try again.');
        return;
      }
    }
    const normalized = adjustItems.map((it, i) => ({ ...it, lineNo: i + 1 }));
    const nextStructured: ParsedRequisitionStructured = {
      ...structuredParsed,
      items: normalized,
      signatories: {
        ...structuredParsed.signatories,
        receivedBy: receivedByOverride ?? structuredParsed.signatories.receivedBy,
      },
    };
    const description = serializeStructuredRequisition(nextStructured);
    const totalQty = normalized.reduce((s, i) => s + i.qty, 0);
    const grandTotal = normalized.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const avgUnit = totalQty > 0 ? grandTotal / totalQty : 0;
    if (request.status === 'Pending' && tid && selectedType) {
      const cap = Number(selectedType.amount || 0);
      const used = await requestsAPI.sumCommittedTotalForBudgetType(tid);
      const remaining = Math.max(0, cap - used);
      const costCents = Math.round(grandTotal * 100);
      const remainingCents = Math.round(remaining * 100);
      if (costCents > remainingCents) {
        setActionError(
          `This request total (${peso(grandTotal)}) exceeds what is left for "${selectedType.name}" (${peso(remaining)} remaining of ${peso(cap)} allocated). Choose another type, reduce the request, or increase the allocation.`
        );
        return;
      }
    }

    setActionLoading(true);
    setActionError('');
    try {
      const patch: Partial<Request> = {
        description,
        quantity: Math.max(1, Math.round(totalQty)),
        unit_price: Number(avgUnit.toFixed(2)),
      };
      if (request.status === 'Pending') {
        patch.status = 'Approved';
        patch.approved_at = new Date().toISOString();
      } else {
        patch.status = request.status;
      }
      await integrityAPI.saveAdjustedWithReason({
        requestId: request.id,
        reason,
        beforeRequest: request,
        afterPatch: patch,
        requisitionPayload: nextStructured,
        beforePayload: {
          description: request.description,
          quantity: request.quantity,
          unit_price: request.unit_price,
          total_price: request.total_price,
        },
        afterPayload: {
          description,
          quantity: patch.quantity,
          unit_price: patch.unit_price,
          total_price: Math.round(grandTotal * 100) / 100,
        },
      });
      if (request.status === 'Pending') {
        await requestsAPI.update(request.id, {
          college_budget_type_id: tid || null,
        });
      }
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.message || 'Could not save.');
    } finally {
      setActionLoading(false);
    }
  };

  const onProceedToProcurement = async () => {
    if (!request) return;
    setActionError('');
    setActionLoading(true);
    try {
      await requestsAPI.markProcuring(request.id);
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.message || 'Could not update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const onMarkProcurementDone = async () => {
    if (!request) return;
    setActionError('');
    setActionLoading(true);
    try {
      await requestsAPI.markProcurementDone(request.id);
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.message || 'Could not update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const onMarkProcurementFailed = async () => {
    if (!request) return;
    const reason = procurementFailedReason.trim();
    if (!reason) {
      setActionError('Enter a reason before marking procurement as failed.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await requestsAPI.markProcurementFailedWithReason(request.id, reason);
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.message || 'Could not update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const onDecline = async () => {
    if (!request) return;
    const reason = declineReason.trim();
    if (!reason) {
      setActionError('Enter a reason for declining.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      await requestsAPI.rejectWithReason(request.id, reason);
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.message || 'Could not decline.');
    } finally {
      setActionLoading(false);
    }
  };

  const onRecordDelivery = async () => {
    if (!request) return;
    setDeliveryError('');
    const qr = Number(qtyReceived);
    const qo = Number(request.quantity ?? 0);
    if (Number.isNaN(qr) || qr < 0) {
      setDeliveryError('Enter a valid quantity received.');
      return;
    }
    const rem = deliveryRemarks.trim();
    if (qr < qo && !rem) {
      setDeliveryError('Remarks are required when quantity received is less than quantity ordered.');
      return;
    }
    setSavingDelivery(true);
    try {
      await requestsAPI.recordPartialDelivery(request.id, {
        quantity_received: qr,
        partial_delivery_remarks: rem || null,
      });
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setDeliveryError(e?.message || 'Could not save delivery.');
    } finally {
      setSavingDelivery(false);
    }
  };

  const onPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const onSendComment = async () => {
    if (!request) return;
    if (!chatAllowed) {
      setCommentError('Chat is currently limited to rejected, adjusted, or procurement-failed requests.');
      return;
    }
    const content = newComment.trim();
    if (!content && !commentFile) {
      setCommentError('Type your message or attach a file first.');
      return;
    }
    setCommentError('');
    setCommentSending(true);
    try {
      let attachmentUrl = '';
      if (commentFile) {
        attachmentUrl = await commentsAPI.uploadAttachment(request.id, commentFile);
      }
      const finalContent = [
        content || null,
        attachmentUrl ? `Attachment: ${attachmentUrl}` : null,
      ]
        .filter((x): x is string => !!x)
        .join('\n');
      await commentsAPI.create(request.id, finalContent);
      setNewComment('');
      setCommentFile(null);
    } catch (e: any) {
      setCommentError(e?.message || 'Could not send message.');
    } finally {
      setCommentSending(false);
    }
  };

  if (!request) return null;

  const editableLineItems =
    adjustEditMode && structuredParsed
      ? { items: adjustItems, onChange: setAdjustItems }
      : null;

  const receivedByEdit =
    structuredParsed && isDeptHead() && ['Pending', 'Approved', 'Procuring', 'ProcurementDone'].includes(request.status)
      ? {
          receivedBy: receivedByOverride ?? structuredParsed.signatories.receivedBy,
          onChange: setReceivedByOverride,
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-8 sm:pt-12">
      <button
        type="button"
        className="print-hide absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="requisition-dialog-title"
        className="print-document-root relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200"
      >
        <div className="print-hide sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <h2 id="requisition-dialog-title" className="text-lg font-semibold text-gray-900 truncate pr-2">
            Requisition — {request.item_name}
          </h2>
          <div className="flex items-center gap-2">
            <Link
              to={`${isDeptHead() ? '/dept-head' : '/faculty'}/requisition-integrity?requestId=${request.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              Timeline
            </Link>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="print-document-content px-4 py-6 sm:px-8 sm:pb-4">
          {parsed && (
            <RequisitionDocumentView
              request={request}
              parsed={parsed}
              editableLineItems={editableLineItems}
              lockCollegeSignatories={!!structuredParsed && isFaculty()}
              receivedByEdit={receivedByEdit}
              showBudgetTypeUsed={isDeptHead()}
            />
          )}

          {(request.rejection_reason || integrityRows.length > 0 || integrityLoading) && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">College admin history</h3>
              {request.rejection_reason ? (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <strong>Decline reason:</strong> {request.rejection_reason}
                </p>
              ) : null}
              {integrityLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading history…
                </div>
              ) : integrityRows.length === 0 ? (
                <p className="text-sm text-gray-500">No admin edit history yet.</p>
              ) : (
                <div className="space-y-2">
                  {integrityRows.filter((row) =>
                      ['admin_edit', 'declined_with_reason', 'approved_with_reason', 'procurement_failed_with_reason'].includes(row.event_type)
                    ).length === 0 ? (
                    <p className="text-sm text-gray-500">No admin edit history yet.</p>
                  ) : (
                    integrityRows
                      .filter((row) =>
                        ['admin_edit', 'declined_with_reason', 'approved_with_reason', 'procurement_failed_with_reason'].includes(row.event_type)
                      )
                      .map((row) => {
                      const label =
                        row.event_type === 'declined_with_reason'
                          ? 'Declined'
                          : row.event_type === 'approved_with_reason'
                            ? 'Approved'
                            : row.event_type === 'procurement_failed_with_reason'
                              ? 'Procurement failed'
                              : 'Edited';
                      return (
                        <div key={row.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                          <p className="font-medium text-gray-900">
                            {label} by {row.actor?.full_name || row.actor?.email || 'College admin'}
                          </p>
                          <p className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</p>
                          {row.reason ? (
                            <p className="mt-1 text-gray-800">
                              <span className="font-medium">Reason:</span> {row.reason}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          )}

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Request conversation</h3>
            <p className="text-xs text-gray-500 mb-3">
              Use this live chat for follow-up on adjustments, failed procurement reasons, and clarifications.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading conversation…
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                    <p className="font-medium text-gray-900">
                      {c.author?.full_name || c.author?.email || 'User'}
                    </p>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {c.content.split('\n').map((line, idx) =>
                        /^Attachment:\s+https?:\/\//i.test(line) ? (
                          <span key={`${c.id}-${idx}`} className="block">
                            Attachment:{' '}
                            <a
                              href={line.replace(/^Attachment:\s+/i, '').trim()}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              Open file
                            </a>
                          </span>
                        ) : (
                          <span key={`${c.id}-${idx}`} className="block">
                            {line}
                          </span>
                        )
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 space-y-2">
              {!chatAllowed ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Chat is enabled only for Rejected, Adjusted, or ProcurementFailed cases in restricted mode.
                </p>
              ) : null}
              <textarea
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  setCommentError('');
                }}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                placeholder="Write a message to college/department..."
                disabled={!chatAllowed || commentSending}
              />
              <input
                type="file"
                onChange={(e) => setCommentFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600"
                disabled={!chatAllowed || commentSending}
              />
              {commentFile ? (
                <p className="text-xs text-gray-600">Selected file: {commentFile.name}</p>
              ) : null}
              {commentError ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{commentError}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={commentSending || !chatAllowed}
                  onClick={() => void onSendComment()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {commentSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send message
                </button>
              </div>
            </div>
          </section>

          {showDeliveryForm && (
            <div className="print-hide mt-8 rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-950">Record received (Department)</h3>
              <p className="text-xs text-blue-900/80">
                Available after your college admin marks procurement done. Enter actual quantity received; if less than
                ordered, remarks are required (e.g. partial shipment, stock-out).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity ordered (system)</label>
                  <input
                    readOnly
                    value={String(request.quantity ?? '')}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity received</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={qtyReceived}
                    onChange={(e) => setQtyReceived(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Remarks {Number(qtyReceived) < Number(request.quantity ?? 0) ? '(required if partial)' : '(optional)'}
                </label>
                <textarea
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="Variance reason, supplier note…"
                />
              </div>
              {deliveryError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deliveryError}</p>
              )}
              <button
                type="button"
                disabled={savingDelivery}
                onClick={() => void onRecordDelivery()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {savingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm received
              </button>
            </div>
          )}
        </div>

        {adjustEditMode && (
          <div className="print-hide sticky bottom-0 z-20 border-t border-amber-200 bg-amber-50/95 backdrop-blur-sm px-4 py-4 sm:px-8">
            <div className="flex flex-col gap-3 max-w-5xl mx-auto">
              <div>
                <label htmlFor="adjust-reason" className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for editing <span className="text-red-700">*</span>
                </label>
                <textarea
                  id="adjust-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white"
                  placeholder="Explain what was corrected and why. This is shown to the requesting department."
                />
              </div>
              {request.status === 'Pending' && (
                <div>
                  <label htmlFor="adjust-budget-type" className="block text-xs font-medium text-gray-700 mb-1">
                    Budget type <span className="text-red-700">*</span>
                  </label>
                  {collegeRemaining !== null ? (
                    <p className="text-xs text-gray-600 mb-1">
                      Budget Ceiling: College available <span className="font-semibold text-gray-900">{peso(collegeRemaining)}</span>
                    </p>
                  ) : null}
                  <select
                    id="adjust-budget-type"
                    value={adjustBudgetTypeId}
                    onChange={(e) => {
                      setAdjustBudgetTypeId(e.target.value);
                      setActionError('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                    disabled={loadingBudgetTypes}
                  >
                    <option value="">Select budget type…</option>
                    {budgetTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.fund_code ? ` (${t.fund_code})` : ''} — Remaining ₱
                        {Number(
                          budgetTypeRemaining[t.id] ?? Number(t.amount || 0)
                        ).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Edited pending requests must be assigned to a budget type before approval.
                  </p>
                </div>
              )}
              {actionError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={cancelAdjust}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || (request.status === 'Pending' && !adjustBudgetTypeId.trim())}
                  onClick={() => void saveAdjustAsApproved()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {request.status === 'Pending' ? 'Save as approved' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showProcurementActionBar && (
          <div className="print-hide sticky bottom-0 z-20 border-t border-emerald-200 bg-emerald-50/95 backdrop-blur-sm px-4 py-4 sm:px-8">
            <div className="flex flex-col gap-3 max-w-5xl mx-auto">
              {actionError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
              )}
              <p className="text-xs text-emerald-950/80">
                {request.status === 'Approved'
                  ? 'When you are ready for your college to run procurement, use the button below. The requesting department can confirm receipt only after procurement is marked done.'
                  : 'Mark this step when procurement work for this request is finished so the department can confirm receipt.'}
              </p>
              {request.status === 'Procuring' && (
                <div>
                  <label htmlFor="procurement-failed-reason" className="block text-xs font-medium text-gray-700 mb-1">
                    Reason if procurement failed <span className="text-red-700">*</span>
                  </label>
                  <textarea
                    id="procurement-failed-reason"
                    value={procurementFailedReason}
                    onChange={(e) => setProcurementFailedReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                    placeholder="Explain why procurement failed. This will be shown to the requesting department."
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {structuredParsed && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={startAdjust}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-600 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 min-w-[7rem]"
                  >
                    <MessageSquareWarning className="w-4 h-4" />
                    Adjust
                  </button>
                )}
                {request.status === 'Approved' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void onProceedToProcurement()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50 min-w-[7rem]"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Proceed to procurement
                  </button>
                )}
                {request.status === 'Procuring' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void onMarkProcurementFailed()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-400 text-gray-800 bg-white hover:bg-gray-100 disabled:opacity-50 min-w-[7rem]"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Procurement failed
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void onMarkProcurementDone()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50 min-w-[7rem]"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Procurement done
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showApprovalBar && (
          <div className="print-hide sticky bottom-0 z-20 border-t border-gray-200 bg-gray-50/95 backdrop-blur-sm px-4 py-4 sm:px-8">
            <div className="flex flex-col gap-3 max-w-5xl mx-auto">
              <div>
                <label htmlFor="decline-reason" className="block text-xs font-medium text-gray-700 mb-1">
                  Reason if declining
                </label>
                <textarea
                  id="decline-reason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                  placeholder="Required when you click Decline"
                />
              </div>
              {actionError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={openApproveModal}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50 min-w-[7rem]"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !structuredParsed}
                  onClick={startAdjust}
                  title={!structuredParsed ? 'Only structured requisitions can be adjusted.' : undefined}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-600 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 min-w-[7rem]"
                >
                  <MessageSquareWarning className="w-4 h-4" />
                  Adjust
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void onDecline()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-400 text-gray-800 bg-white hover:bg-gray-100 disabled:opacity-50 min-w-[7rem]"
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showApproveModal && (
        <div className="print-hide fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close approve dialog"
            onClick={() => setShowApproveModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-request-title"
            className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-6"
          >
            <h3 id="approve-request-title" className="text-lg font-semibold text-gray-900">
              Approve request
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Choose which college budget type (sub-category) this request will charge against.
            </p>
            {loadingBudgetTypes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="approve-budget-type" className="block text-sm font-medium text-gray-800 mb-1">
                  Budget type
                </label>
                {collegeRemaining !== null ? (
                  <p className="text-xs text-gray-600 mb-2">
                    Budget Ceiling: College available <span className="font-semibold text-gray-900">{peso(collegeRemaining)}</span>
                  </p>
                ) : null}
                <select
                  id="approve-budget-type"
                  value={approveBudgetTypeId}
                  onChange={(e) => {
                    setApproveBudgetTypeId(e.target.value);
                    setApproveModalError('');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 bg-white"
                >
                  {budgetTypes.length === 0 ? (
                    <option value="">General college pool (no sub-categories defined)</option>
                  ) : (
                    <>
                      <option value="">Select budget type…</option>
                      {budgetTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.fund_code ? ` (${t.fund_code})` : ''} — Remaining ₱
                          {Number(
                            budgetTypeRemaining[t.id] ?? Number(t.amount || 0)
                          ).toLocaleString()}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {budgetTypes.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">You must select a budget type before confirming.</p>
                )}
                <label htmlFor="approve-reason" className="block text-sm font-medium text-gray-800 mb-1 mt-4">
                  Approval reason <span className="text-red-700">*</span>
                </label>
                <textarea
                  id="approve-reason"
                  value={approveReason}
                  onChange={(e) => {
                    setApproveReason(e.target.value);
                    setApproveModalError('');
                  }}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                  placeholder="Explain why this requisition is approved."
                />
                {hasPriorAdminEdits ? (
                  <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={approveEditedConfirm}
                      onChange={(e) => setApproveEditedConfirm(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I confirm I reviewed prior admin edits and their reasons before approval.</span>
                  </label>
                ) : null}
              </div>
            )}
            {approveModalError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
                {approveModalError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                disabled={approveModalLoading}
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveModalLoading || loadingBudgetTypes}
                onClick={() => void confirmApprove()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50"
              >
                {approveModalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
