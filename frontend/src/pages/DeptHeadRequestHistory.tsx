import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegeBudgetTypesAPI, commentsAPI, requestsAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import type { College, RequestWithRelations } from '../types/database';
import { Eye, Loader2 } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';
import { Link, useSearchParams } from 'react-router-dom';
import { getRequestChatReadAt, markRequestChatReadNow } from '../lib/chatUnread';

const amount = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function DeptHeadRequestHistory() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<College | null>(null);
  const [typeRemainingById, setTypeRemainingById] = useState<Record<string, number>>({});
  const [collegeRemaining, setCollegeRemaining] = useState<number | null>(null);
  const [unreadByRequestId, setUnreadByRequestId] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [search, setSearch] = useState('');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledRequestIdFromUrl = useRef<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!profile?.id) {
        setRows([]);
        setCollege(null);
        return;
      }
      const { college: handled, requests } = await requestsAPI.getForHandledCollege(profile.id);
      setCollege(handled);
      setRows(requests);
      const committedStatuses = ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'];
      const committed = requests
        .filter((r) => committedStatuses.includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
      const overallCeiling = Number(profile.approved_budget || 0);
      setCollegeRemaining(Math.max(0, overallCeiling - committed));

      if (!handled?.id) {
        setTypeRemainingById({});
        return;
      }
      const types = (await collegeBudgetTypesAPI.getByCollegeId(handled.id)).filter((t) => t.is_active);
      const nextRemaining: Record<string, number> = {};
      for (const t of types) {
        const used = requests
          .filter((r) => committedStatuses.includes(r.status) && r.college_budget_type_id === t.id)
          .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
        nextRemaining[t.id] = Math.max(0, Number(t.amount || 0) - used);
      }
      setTypeRemainingById(nextRemaining);
      const latestComments = await commentsAPI.getLatestByRequestIds(requests.map((r) => r.id));
      const nextUnread: Record<string, number> = {};
      for (const r of requests) {
        const latestAt = latestComments[r.id];
        if (!latestAt) {
          nextUnread[r.id] = 0;
          continue;
        }
        const readAt = getRequestChatReadAt(profile.id, r.id);
        nextUnread[r.id] = !readAt || new Date(latestAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
      }
      setUnreadByRequestId(nextUnread);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
      setTypeRemainingById({});
      setCollegeRemaining(null);
      setUnreadByRequestId({});
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel(`dept-head-requests-${profile?.id || 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            void loadRows();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, loadRows]);

  const rawStatusTab = (searchParams.get('status') || '').toLowerCase();
  const departmentFilter = (searchParams.get('department') || '').trim();
  const activeStatusTab: 'all' | 'pending' | 'approved' | 'procuring' | 'history' | 'notifications' =
    rawStatusTab === 'pending' ||
    rawStatusTab === 'approved' ||
    rawStatusTab === 'procuring' ||
    rawStatusTab === 'history' ||
    rawStatusTab === 'notifications'
      ? rawStatusTab
      : 'all';

  const activeWorkflowRows = useMemo(
    () =>
      rows.filter(
        (r) => !['Draft', 'ProcurementDone', 'Received', 'Completed'].includes(r.status)
      ),
    [rows]
  );
  const procurementHistoryRows = useMemo(
    () => rows.filter((r) => ['ProcurementDone', 'Received', 'Completed'].includes(r.status)),
    [rows]
  );

  const setStatusTab = (status: 'all' | 'pending' | 'approved' | 'procuring' | 'history' | 'notifications') => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    if (status === 'all') next.delete('status');
    else next.set('status', status);
    setSearchParams(next);
  };

  const statusFilteredRows = useMemo(() => {
    if (activeStatusTab === 'notifications') {
      return activeWorkflowRows.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status));
    }
    if (activeStatusTab === 'pending') {
      return activeWorkflowRows.filter((r) => r.status === 'Pending');
    }
    if (activeStatusTab === 'approved') {
      return activeWorkflowRows.filter((r) => r.status === 'Approved');
    }
    if (activeStatusTab === 'procuring') {
      return activeWorkflowRows.filter((r) => r.status === 'Procuring');
    }
    if (activeStatusTab === 'history') {
      return procurementHistoryRows;
    }
    return activeWorkflowRows;
  }, [activeWorkflowRows, procurementHistoryRows, activeStatusTab]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byDepartment = departmentFilter
      ? statusFilteredRows.filter(
          (r) => (r.requester?.faculty_department || '').trim().toLowerCase() === departmentFilter.toLowerCase()
        )
      : statusFilteredRows;
    if (!q) return byDepartment;
    return byDepartment.filter((r) => {
      const requester = `${r.requester?.full_name || ''} ${r.requester?.faculty_department || ''}`.toLowerCase();
      const rowText = `${r.item_name} ${r.ris_no || ''} ${r.sai_no || ''} ${r.status}`.toLowerCase();
      return rowText.includes(q) || requester.includes(q);
    });
  }, [statusFilteredRows, search, departmentFilter]);

  const subtitle = useMemo(() => {
    if (activeStatusTab === 'notifications') {
      return 'Rejected and procurement-failed requests from your handled college.';
    }
    if (!college?.name) return 'Track requests and status updates.';
    return `Requisitions from your college (${college.name}). Open a row to read the full submitted form.`;
  }, [college?.name, activeStatusTab]);

  const requestIdParam = searchParams.get('requestId');
  useEffect(() => {
    if (!requestIdParam) {
      handledRequestIdFromUrl.current = null;
      return;
    }
    if (loading || rows.length === 0 || !profile?.id) return;
    if (handledRequestIdFromUrl.current === requestIdParam) return;
    const found = rows.find((r) => r.id === requestIdParam);
    if (!found) return;
    handledRequestIdFromUrl.current = requestIdParam;
    markRequestChatReadNow(profile.id, found.id);
    setUnreadByRequestId((prev) => ({ ...prev, [found.id]: 0 }));
    setViewing(found);
  }, [requestIdParam, loading, rows, profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request & History</h1>
        <p className="text-base text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'procuring', label: 'Procuring' },
            { id: 'history', label: 'Procurement Completed' },
            { id: 'notifications', label: 'Notifications' },
          ] as const).map((tab) => {
            const active = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  active
                    ? 'bg-red-900 text-white border-red-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RIS/SAI, requester, department, item..."
            className="w-full md:w-[420px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
        </div>
        {departmentFilter ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs">
              Department filter: {departmentFilter}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('department');
                setSearchParams(next);
              }}
              className="text-xs text-gray-600 underline hover:text-gray-900"
            >
              Clear
            </button>
          </div>
        ) : null}
        {collegeRemaining !== null ? (
          <div className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs">
            Budget Ceiling: College remaining {amount(collegeRemaining)}
          </div>
        ) : null}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">RIS / SAI No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requisition</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Integrity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    {activeStatusTab === 'notifications'
                      ? 'No notifications found.'
                      : activeStatusTab === 'pending'
                      ? 'No pending requests found.'
                      : activeStatusTab === 'approved'
                      ? 'No approved requests found.'
                      : activeStatusTab === 'procuring'
                      ? 'No procuring requests found.'
                      : activeStatusTab === 'history'
                      ? 'No procurement history yet.'
                      : 'No requests found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">
                      {r.ris_no ? (
                        <>
                          <span className="block text-gray-900">{r.ris_no}</span>
                          <span className="block text-gray-500">{r.sai_no || '—'}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px]">
                      <span className="font-medium line-clamp-2">{r.item_name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {r.requester?.full_name ?? '—'}
                      {r.requester?.faculty_department?.trim() ? (
                        <span className="block text-xs text-gray-500">{r.requester.faculty_department}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 ${
                          !r.submitted_payload_hash || r.last_integrity_reason === 'legacy_unhashed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {!r.submitted_payload_hash || r.last_integrity_reason === 'legacy_unhashed'
                          ? 'Legacy'
                          : `v${r.integrity_version || 1}`}
                      </span>
                      <Link
                        to={`/dept-head/requisition-integrity?requestId=${r.id}`}
                        className="ml-2 text-red-900 hover:underline"
                      >
                        Timeline
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{amount(r.total_price || 0)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {r.college_budget_type_id ? (
                        <span className="inline-flex rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">
                          Type rem: {amount(typeRemainingById[r.college_budget_type_id] ?? 0)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                          General pool
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (profile?.id) {
                            markRequestChatReadNow(profile.id, r.id);
                            setUnreadByRequestId((prev) => ({ ...prev, [r.id]: 0 }));
                          }
                          setViewing(r);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View form
                        {unreadByRequestId[r.id] ? (
                          <span className="inline-flex w-2 h-2 rounded-full bg-red-600" title="Unread chat" />
                        ) : null}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <RequisitionViewModal
        request={viewing}
        onClose={() => setViewing(null)}
        onRecorded={() => {
          void loadRows();
        }}
      />
    </div>
  );
}
