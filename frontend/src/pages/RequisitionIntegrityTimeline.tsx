import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { integrityAPI, requestsAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import type { IntegrityEventWithActor, RequestWithRelations } from '../types/database';

export default function RequisitionIntegrityTimeline() {
  const { isDeptHead } = useAuth();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [requestRow, setRequestRow] = useState<RequestWithRelations | null>(null);
  const [events, setEvents] = useState<IntegrityEventWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backPath = isDeptHead() ? '/dept-head/request-history' : '/faculty/request-history';

  useEffect(() => {
    if (!requestId) {
      setError('Missing requisition id.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void Promise.all([requestsAPI.getById(requestId), integrityAPI.getTimelineByRequestId(requestId)])
      .then(([req, timeline]) => {
        if (cancelled) return;
        setRequestRow(req);
        setEvents(timeline);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load integrity timeline.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const legacyUnhashed = useMemo(
    () => !requestRow?.submitted_payload_hash || requestRow.last_integrity_reason === 'legacy_unhashed',
    [requestRow]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requisition Integrity Timeline</h1>
          <p className="text-base text-gray-500 mt-1">
            Full audit chain for admin edits and sensitive status decisions.
          </p>
        </div>
        <Link
          to={backPath}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
        >
          Back to history
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      ) : !requestRow ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Request not found.</div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-900 font-semibold">{requestRow.item_name}</p>
            <p className="text-xs text-gray-500 mt-1">RIS: {requestRow.ris_no || '—'} · SAI: {requestRow.sai_no || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Integrity version: <span className="font-semibold text-gray-800">{requestRow.integrity_version || 1}</span>
            </p>
            {legacyUnhashed ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Legacy record: canonical submitted hash is unavailable. Integrity chain starts from the first controlled admin action.
              </p>
            ) : (
              <p className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                Hash chain anchored. Submitted hash and latest hash are tracked.
              </p>
            )}
          </section>

          <section className="space-y-3">
            {events.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
                No integrity events recorded yet.
              </div>
            ) : (
              events.map((ev) => (
                <article key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{ev.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{new Date(ev.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Actor: {ev.actor?.full_name || ev.actor?.email || 'System'}
                  </p>
                  {ev.reason ? (
                    <p className="mt-2 text-sm text-gray-800">
                      <span className="font-medium">Reason:</span> {ev.reason}
                    </p>
                  ) : null}
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                    <p className="rounded border border-gray-200 bg-gray-50 px-2 py-1">
                      Hash before: <span className="font-mono">{ev.payload_hash_before || '—'}</span>
                    </p>
                    <p className="rounded border border-gray-200 bg-gray-50 px-2 py-1">
                      Hash after: <span className="font-mono">{ev.payload_hash_after || '—'}</span>
                    </p>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
