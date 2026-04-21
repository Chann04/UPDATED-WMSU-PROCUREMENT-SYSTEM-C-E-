import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { commentsAPI, requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { Eye, Loader2 } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';
import RequestFormChooserModal from '../components/RequestFormChooserModal';
import InventoryCustodianSlipModal from '../components/InventoryCustodianSlipModal';
import { getRequestChatReadAt, markRequestChatReadNow } from '../lib/chatUnread';

const amount = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function FacultyRequestHistory() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [choosingFormFor, setChoosingFormFor] = useState<RequestWithRelations | null>(null);
  const [viewingInventory, setViewingInventory] = useState<RequestWithRelations | null>(null);
  const [unreadByRequestId, setUnreadByRequestId] = useState<Record<string, number>>({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledRequestIdFromUrl = useRef<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await requestsAPI.getMyRequests();
      setRows(data);
      setViewing((v) => (v ? data.find((r) => r.id === v.id) ?? v : null));
      const latestComments = await commentsAPI.getLatestByRequestIds(data.map((r) => r.id));
      const nextUnread: Record<string, number> = {};
      for (const r of data) {
        const latestAt = latestComments[r.id];
        if (!latestAt) {
          nextUnread[r.id] = 0;
          continue;
        }
        const readAt = getRequestChatReadAt(user.id, r.id);
        nextUnread[r.id] = !readAt || new Date(latestAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
      }
      setUnreadByRequestId(nextUnread);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        void loadRows();
      }, 150);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [loadRows]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const channel = supabase
      .channel(`faculty-my-requests-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `requester_id=eq.${uid}`,
        },
        () => {
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            void loadRows();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadRows]);

  const requestIdParam = searchParams.get('requestId');
  useEffect(() => {
    if (!requestIdParam) {
      handledRequestIdFromUrl.current = null;
      return;
    }
    if (loading || rows.length === 0 || !user?.id) return;
    if (handledRequestIdFromUrl.current === requestIdParam) return;
    const found = rows.find((r) => r.id === requestIdParam);
    if (!found) return;
    handledRequestIdFromUrl.current = requestIdParam;
    markRequestChatReadNow(user.id, found.id);
    setUnreadByRequestId((prev) => ({ ...prev, [found.id]: 0 }));
    setViewing(found);
  }, [requestIdParam, loading, rows, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request & History</h1>
        <p className="text-base text-gray-500 mt-1">
          Track your submitted procurement requests. Use <strong>View form</strong> to see the full requisition.
        </p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Integrity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">
                      {r.ris_no ? (
                        <>
                          <span className="block text-gray-900">{r.ris_no}</span>
                          <span className="block text-gray-500">{r.sai_no || '—'}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">
                          {r.status === 'Draft' ? 'not sent' : 'pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.item_name}</td>
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
                        to={`/faculty/requisition-integrity?requestId=${r.id}`}
                        className="ml-2 text-red-900 hover:underline"
                      >
                        Timeline
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{amount(r.total_price || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          markRequestChatReadNow(user.id, r.id);
                          setUnreadByRequestId((prev) => ({ ...prev, [r.id]: 0 }));
                          setChoosingFormFor(r);
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
        onRecorded={() => void loadRows()}
      />
      <RequestFormChooserModal
        request={choosingFormFor}
        onClose={() => setChoosingFormFor(null)}
        onChooseRequisition={() => {
          setViewing(choosingFormFor);
          setChoosingFormFor(null);
        }}
        onChooseInventory={() => {
          setViewingInventory(choosingFormFor);
          setChoosingFormFor(null);
        }}
      />
      <InventoryCustodianSlipModal request={viewingInventory} onClose={() => setViewingInventory(null)} />
    </div>
  );
}
