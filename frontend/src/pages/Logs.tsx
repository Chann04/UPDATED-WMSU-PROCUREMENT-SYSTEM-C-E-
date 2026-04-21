import { useState, useEffect, useRef } from 'react';
import { activityAPI, auditAPI } from '../lib/supabaseApi';
import type { ActivityWithActor, AuditEvent } from '../types/database';
import { Loader2, ScrollText } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';
import { supabase } from '../lib/supabaseClient';

type Row = ActivityWithActor & {
  request?: { id: string; item_name: string; status: string } | null;
};

type AuditRow = AuditEvent & { actor?: { full_name: string; email: string } | null };

type UnifiedRow = {
  id: string;
  created_at: string;
  userLabel: string;
  actionLabel: string;
  requestLabel: string;
  details: unknown;
};

export default function Logs() {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [activity, audit] = await Promise.all([
          activityAPI.getAllRecent(200),
          auditAPI.getRecent(200),
        ]);

        const aRows = (activity as Row[]).map<UnifiedRow>((r) => ({
          id: `activity:${r.id}`,
          created_at: r.created_at,
          userLabel: r.actor?.full_name || r.actor?.email || '—',
          actionLabel: formatAction(r.action),
          requestLabel: r.request?.item_name || '—',
          details: r.details ?? null,
        }));

        const auditRows = (audit as AuditRow[]).map<UnifiedRow>((r) => ({
          id: `audit:${r.id}`,
          created_at: r.created_at,
          userLabel: r.actor?.full_name || r.actor?.email || '—',
          actionLabel: formatAuditAction(r.event_type),
          requestLabel: formatAuditEntity(r.entity, r.details),
          details: r.details ?? null,
        }));

        const merged = [...auditRows, ...aRows].sort(
          (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
        );
        if (!cancelled) setRows(merged);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load activity log');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();

    // Live updates: when request_activity inserts, reload list (payload doesn't include joins).
    const channel = supabase
      .channel('logs-request-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_activity' },
        () => {
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            void refresh();
          }, 350);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_events' },
        () => {
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            void refresh();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, []);

  const formatAction = (action: string) => {
    switch (action) {
      case 'created': return 'Created';
      case 'status_changed': return 'Status changed';
      case 'delegated': return 'Delegated';
      case 'comment_added': return 'Comment';
      default: return action;
    }
  };

  const formatAuditAction = (eventType: string) => {
    switch (eventType) {
      case 'login': return 'Login';
      case 'account_created': return 'Account created';
      case 'user_updated': return 'User updated';
      case 'college_created': return 'College created';
      case 'college_updated': return 'College updated';
      case 'college_deleted': return 'College deleted';
      default: return eventType;
    }
  };

  const formatAuditEntity = (entity: string | null, details: unknown) => {
    if (entity === 'colleges' || entity === 'college' || entity === 'profiles' || entity === 'auth') return entity;
    const d = details as any;
    if (typeof d?.name === 'string') return d.name;
    return entity ?? '—';
  };

  const formatDetails = (details: unknown): string => {
    if (details == null) return '—';
    if (typeof details === 'string') return details;
    if (typeof details !== 'object') return String(details);
    const d: any = details;
    const safeVal = (v: any) => {
      if (v == null || v === '') return '—';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—';
      if (typeof v === 'string') return v;
      try {
        return JSON.stringify(v);
      } catch {
        return '—';
      }
    };

    const diff = (before: any, after: any, keys?: string[]) => {
      if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return '';
      const out: string[] = [];
      const allKeys = keys ?? Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
      for (const k of allKeys) {
        const b = before[k];
        const a = after[k];
        const same = (() => {
          if (typeof b === 'object' || typeof a === 'object') {
            try {
              return JSON.stringify(b) === JSON.stringify(a);
            } catch {
              return b === a;
            }
          }
          return b === a;
        })();
        if (!same) out.push(`${k}: ${safeVal(b)} → ${safeVal(a)}`);
      }
      return out.join(' | ');
    };

    // Common event shapes
    if (typeof d.from === 'string' || typeof d.to === 'string') return `${safeVal(d.from)} → ${safeVal(d.to)}`;
    if (typeof d.item_name === 'string' && typeof d.status === 'string') return `${d.item_name} · Status: ${d.status}`;
    if (typeof d.status === 'string') return `Status: ${d.status}`;
    if (typeof d.comment_id === 'string') return `Comment added (${d.comment_id})`;

    // Audit: college CRUD
    if (typeof d.name === 'string') return d.name;

    // Audit: account created / login
    if (typeof d.email === 'string' && typeof d.role === 'string') {
      return `${d.email} · ${d.role}${d.department ? ` · ${d.department}` : ''}`;
    }
    if (typeof d.email === 'string') return d.email;

    // Audit: before/after diffs (profiles update, colleges update, etc.)
    if (d.before && d.after && typeof d.before === 'object' && typeof d.after === 'object') {
      // Prefer known key orders when present
      const profileKeys = ['full_name', 'email', 'role', 'department', 'faculty_department', 'approved_budget'];
      const collegeKeys = ['name', 'handler_id', 'allocation_mode', 'allocation_value', 'is_active'];
      const keys =
        profileKeys.some((k) => k in d.before || k in d.after)
          ? profileKeys
          : collegeKeys.some((k) => k in d.before || k in d.after)
            ? collegeKeys
            : undefined;
      const formatted = diff(d.before, d.after, keys);
      if (formatted) return formatted;
    }

    // Fallback: compact JSON
    try {
      return JSON.stringify(details);
    } catch {
      return '—';
    }
  };

  const actionBadgeClass = (action: string) => {
    const s = (action || '').toLowerCase();
    const positive = ['created', 'approve', 'approved', 'accept', 'accepted', 'login', 'completed', 'received'];
    const negative = ['deleted', 'deny', 'denied', 'reject', 'rejected', 'failed', 'error'];

    if (positive.some((k) => s.includes(k))) {
      return 'bg-green-50 text-green-700';
    }
    if (negative.some((k) => s.includes(k))) {
      return 'bg-red-50 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-red-900" />
          Logs
        </h1>
        <p className="text-base text-gray-500 mt-1">
          Recent procurement request activity (audit trail).
        </p>
      </div>

      <CenteredAlert error={error || undefined} onClose={() => setError('')} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">When</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Request</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No activity yet. Actions on requests will appear here.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.userLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${actionBadgeClass(r.actionLabel)}`}>
                        {r.actionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="truncate block" title={r.requestLabel}>
                        {r.requestLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <span className="text-xs whitespace-pre-wrap break-words font-sans block">
                        {formatDetails(r.details)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
