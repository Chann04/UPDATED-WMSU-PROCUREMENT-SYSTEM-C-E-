import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestsAPI } from '../lib/supabaseApi';
import type { College, RequestWithRelations } from '../types/database';
import { Eye, Loader2 } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';
import { useSearchParams } from 'react-router-dom';

const amount = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function DeptHeadRequestHistory() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<College | null>(null);
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);

  const loadRows = async () => {
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
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, [profile?.id]);

  const activeView = searchParams.get('view');
  const filteredRows = useMemo(() => {
    if (activeView === 'notifications') {
      return rows.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status));
    }
    if (activeView === 'new') {
      return rows.filter((r) => r.status === 'Pending');
    }
    return rows;
  }, [rows, activeView]);

  const subtitle = useMemo(() => {
    if (activeView === 'notifications') {
      return 'Rejected and procurement-failed requests from your handled college.';
    }
    if (activeView === 'new') {
      return 'New submitted requests waiting for your review. Drafts are excluded.';
    }
    if (!college?.name) return 'Track requests and status updates.';
    return `Requisitions from your college (${college.name}). Open a row to read the full submitted form.`;
  }, [college?.name, activeView]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request & History</h1>
        <p className="text-base text-gray-500 mt-1">{subtitle}</p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    {activeView === 'notifications'
                      ? 'No notifications found.'
                      : activeView === 'new'
                      ? 'No new requests found.'
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
                    <td className="px-4 py-3 text-sm text-gray-700">{amount(r.total_price || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View form
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
