import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  Mail,
  Layers,
  Building2,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collegesAPI, registrationAPI } from '../lib/supabaseApi';
import type { Profile } from '../types/database';
import { CenteredAlert } from '../components/CenteredAlert';

/** Registration inbox shown to the College Admin (DeptHead role). */
export default function RegistrationRequests() {
  const { profile } = useAuth();
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [requests, setRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Record<string, 'approve' | 'decline'>>(
    {}
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInbox = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    try {
      const colleges = await collegesAPI.getAll();
      const mine = colleges.find((c) => c.handler_id === profile.id) ?? null;
      const name = mine?.name ?? profile.department ?? null;
      setCollegeName(name);
      if (!name) {
        setRequests([]);
        return;
      }
      const rows = await registrationAPI.listPendingForCollege(name);
      setRequests(rows);
    } catch (e: any) {
      setError(e?.message || 'Failed to load registration requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const formatName = (p: Profile): string => {
    const first = p.first_name?.trim() || '';
    const middle = p.middle_initial?.trim() || '';
    const last = p.family_name?.trim() || '';
    const composed = [first, middle, last].filter(Boolean).join(' ').trim();
    return composed || p.full_name?.trim() || p.email;
  };

  const handleAccept = async (p: Profile) => {
    setPendingIds((s) => ({ ...s, [p.id]: 'approve' }));
    setError('');
    setSuccess('');
    try {
      await registrationAPI.approve(p.id);
      setRequests((rows) => rows.filter((r) => r.id !== p.id));
      setSuccess(`${formatName(p)} has been approved.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve registration.');
    } finally {
      setPendingIds((s) => {
        const next = { ...s };
        delete next[p.id];
        return next;
      });
    }
  };

  const handleDecline = async (p: Profile) => {
    setPendingIds((s) => ({ ...s, [p.id]: 'decline' }));
    setError('');
    setSuccess('');
    try {
      await registrationAPI.decline(p.id);
      setRequests((rows) => rows.filter((r) => r.id !== p.id));
      setSuccess(`${formatName(p)}'s registration was declined.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to decline registration.');
    } finally {
      setPendingIds((s) => {
        const next = { ...s };
        delete next[p.id];
        return next;
      });
    }
  };

  const subtitle = useMemo(() => {
    if (!collegeName) return 'Your account is not linked to any college yet.';
    return `Pending registrations for ${collegeName}.`;
  }, [collegeName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-red-900" />
            Registration Requests
          </h1>
          <p className="text-base text-gray-500 mt-1">{subtitle}</p>
        </div>
        {collegeName && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-900 text-sm font-medium border border-red-200">
            <Building2 className="w-4 h-4" />
            {collegeName}
          </span>
        )}
      </div>

      <CenteredAlert
        error={error || undefined}
        success={success || undefined}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      />

      {!collegeName ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-600">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="mt-3 font-medium text-gray-800">No college assigned</p>
          <p className="text-sm text-gray-500 mt-1">
            Ask the WMSU Admin to link your account to a college so you can review
            incoming registrations.
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="mt-3 font-medium text-gray-800">No pending requests</p>
          <p className="text-sm text-gray-500 mt-1">
            New sign-ups for {collegeName} will appear here for your review.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((p) => {
            const busy = pendingIds[p.id];
            return (
              <li
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-red-900 text-white rounded-full flex items-center justify-center font-semibold shadow-sm flex-shrink-0">
                    {(formatName(p).charAt(0) || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {formatName(p)}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                      <Mail className="w-4 h-4 text-red-900 flex-shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </p>
                    {p.faculty_department && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Layers className="w-3.5 h-3.5 text-red-900" />
                        {p.faculty_department}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleDecline(p)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy === 'decline' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept(p)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white hover:bg-red-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy === 'approve' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Accept
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
