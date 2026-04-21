import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  commentsAPI,
  integrityAPI,
  registrationAPI,
  requestsAPI,
} from '../lib/supabaseApi';
import { getRequestChatReadAt, markRequestChatReadNow } from '../lib/chatUnread';
import { requestAllowsChat } from '../lib/chatPolicy';
import {
  cleanupHeaderNotificationDismissals,
  dismissAttentionNotification,
  dismissPendingNotification,
  getRegistrationSeenCount,
  isAttentionNotificationDismissed,
  isPendingNotificationDismissed,
  markRegistrationNotificationsSeen,
} from '../lib/headerNotificationDismiss';

type NotifState = {
  pendingCollege: { id: string; label: string }[];
  pendingCollegeTotal: number;
  pendingCollegeAllIds: string[];
  unreadChats: { id: string; label: string }[];
  attention: { id: string; label: string; reason: string; status: string }[];
  pendingRegistrations: number;
};

const emptyState: NotifState = {
  pendingCollege: [],
  pendingCollegeTotal: 0,
  pendingCollegeAllIds: [],
  unreadChats: [],
  attention: [],
  pendingRegistrations: 0,
};

export default function HeaderNotifications() {
  const { user, profile, isAdmin, isDeptHead, isFaculty } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotifState>(emptyState);
  const wrapRef = useRef<HTMLDivElement>(null);

  const basePath = isDeptHead() ? '/dept-head' : '/faculty';

  const load = useCallback(async () => {
    if (!user?.id || !profile?.id || isAdmin()) return;
    setLoading(true);
    try {
      if (isDeptHead()) {
        const { requests } = await requestsAPI.getForHandledCollege(profile.id);
        const pending = requests.filter((r) => r.status === 'Pending');
        const attention = requests.filter((r) =>
          ['Rejected', 'ProcurementFailed'].includes(r.status)
        );
        cleanupHeaderNotificationDismissals(
          user.id,
          new Set(pending.map((r) => r.id)),
          new Set(attention.map((r) => r.id))
        );
        const pendingActive = pending.filter((r) => !isPendingNotificationDismissed(user.id, r.id));
        const attentionActive = attention.filter((r) => !isAttentionNotificationDismissed(user.id, r.id));
        const ids = requests.map((r) => r.id);
        const latest = ids.length ? await commentsAPI.getLatestByRequestIds(ids) : {};
        const adminEdited = ids.length ? await integrityAPI.getRequestIdsWithAdminEdit(ids) : new Set<string>();

        const unreadChats: { id: string; label: string }[] = [];
        for (const r of requests) {
          const la = latest[r.id];
          if (!la) continue;
          const readAt = getRequestChatReadAt(user.id, r.id);
          const isUnread = !readAt || new Date(la).getTime() > new Date(readAt).getTime();
          if (!isUnread) continue;
          if (!requestAllowsChat(r.status, adminEdited.has(r.id))) continue;
          unreadChats.push({ id: r.id, label: r.item_name });
        }

        let pendingRegistrations = 0;
        const collegeName = profile.department?.trim();
        if (collegeName) {
          try {
            const regs = await registrationAPI.listPendingForCollege(collegeName);
            pendingRegistrations = regs.length;
          } catch {
            pendingRegistrations = 0;
          }
        }

        setData({
          pendingCollege: pendingActive.slice(0, 5).map((r) => ({ id: r.id, label: r.item_name })),
          pendingCollegeTotal: pendingActive.length,
          pendingCollegeAllIds: pendingActive.map((r) => r.id),
          unreadChats: unreadChats.slice(0, 8),
          attention: attentionActive.slice(0, 6).map((r) => ({
            id: r.id,
            label: r.item_name,
            reason: (r.rejection_reason || 'No reason recorded.').trim(),
            status: r.status,
          })),
          pendingRegistrations,
        });
      } else if (isFaculty()) {
        const requests = await requestsAPI.getMyRequests();
        const attention = requests.filter((r) =>
          ['Rejected', 'ProcurementFailed'].includes(r.status)
        );
        cleanupHeaderNotificationDismissals(
          user.id,
          new Set(),
          new Set(attention.map((r) => r.id))
        );
        const attentionActive = attention.filter((r) => !isAttentionNotificationDismissed(user.id, r.id));
        const ids = requests.map((r) => r.id);
        const latest = ids.length ? await commentsAPI.getLatestByRequestIds(ids) : {};
        const adminEdited = ids.length ? await integrityAPI.getRequestIdsWithAdminEdit(ids) : new Set<string>();

        const unreadChats: { id: string; label: string }[] = [];
        for (const r of requests) {
          const la = latest[r.id];
          if (!la) continue;
          const readAt = getRequestChatReadAt(user.id, r.id);
          const isUnread = !readAt || new Date(la).getTime() > new Date(readAt).getTime();
          if (!isUnread) continue;
          if (!requestAllowsChat(r.status, adminEdited.has(r.id))) continue;
          unreadChats.push({ id: r.id, label: r.item_name });
        }

        setData({
          pendingCollege: [],
          pendingCollegeTotal: 0,
          pendingCollegeAllIds: [],
          unreadChats: unreadChats.slice(0, 8),
          attention: attentionActive.slice(0, 6).map((r) => ({
            id: r.id,
            label: r.item_name,
            reason: (r.rejection_reason || 'No reason recorded.').trim(),
            status: r.status,
          })),
          pendingRegistrations: 0,
        });
      } else {
        setData(emptyState);
      }
    } catch {
      setData(emptyState);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.id, profile?.department, isAdmin, isDeptHead, isFaculty]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const registrationBadgeActive =
    isDeptHead() &&
    user?.id &&
    data.pendingRegistrations > getRegistrationSeenCount(user.id);

  const badgeCount = useMemo(() => {
    const ids = new Set<string>();
    data.pendingCollegeAllIds.forEach((id) => ids.add(id));
    data.unreadChats.forEach((u) => ids.add(u.id));
    data.attention.forEach((a) => ids.add(a.id));
    let n = ids.size;
    if (registrationBadgeActive) n += 1;
    return n;
  }, [data, registrationBadgeActive]);

  if (isAdmin() || !profile?.id || (!isDeptHead() && !isFaculty())) {
    return null;
  }

  const refresh = () => void load();

  const onChatLineClick = (requestId: string) => {
    if (user?.id) markRequestChatReadNow(user.id, requestId);
    setOpen(false);
    refresh();
  };

  const onPendingLineClick = (requestId: string) => {
    if (user?.id) dismissPendingNotification(user.id, requestId);
    setOpen(false);
    refresh();
  };

  const onAttentionLineClick = (requestId: string) => {
    if (user?.id) {
      dismissAttentionNotification(user.id, requestId);
      markRequestChatReadNow(user.id, requestId);
    }
    setOpen(false);
    refresh();
  };

  const onRegistrationSectionClick = () => {
    if (user?.id) {
      markRegistrationNotificationsSeen(user.id, data.pendingRegistrations);
    }
    setOpen(false);
    refresh();
  };

  const onViewAllPendingClick = () => {
    if (!user?.id) return;
    for (const id of data.pendingCollegeAllIds) {
      dismissPendingNotification(user.id, id);
    }
    setOpen(false);
    refresh();
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <div className="border-b border-gray-100 last:border-0 pb-3 last:pb-0 mb-3 last:mb-0">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center p-2 rounded-lg border border-red-600/70 text-red-100 hover:bg-red-800 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full bg-white text-red-900 text-[10px] font-bold px-0.5">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl z-[100] p-3"
          role="menu"
        >
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-red-900 shrink-0" /> : null}
          </div>

          {isDeptHead() && data.pendingCollegeTotal > 0 ? (
            <Section title={`Pending college action (${data.pendingCollegeTotal})`}>
              <ul className="space-y-1.5">
                {data.pendingCollege.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`${basePath}/request-history?status=pending&requestId=${p.id}`}
                      onClick={() => onPendingLineClick(p.id)}
                      className="block text-sm text-red-900 hover:underline line-clamp-2"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {data.pendingCollegeTotal > data.pendingCollege.length ? (
                <Link
                  to={`${basePath}/request-history?status=pending`}
                  onClick={() => onViewAllPendingClick()}
                  className="inline-block mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  View all pending →
                </Link>
              ) : null}
            </Section>
          ) : null}

          {data.unreadChats.length > 0 ? (
            <Section title="Unread chat (restricted threads)">
              <ul className="space-y-1.5">
                {data.unreadChats.map((u) => (
                  <li key={u.id}>
                    <Link
                      to={`${basePath}/request-history?requestId=${u.id}`}
                      onClick={() => onChatLineClick(u.id)}
                      className="block text-sm text-red-900 hover:underline line-clamp-2"
                    >
                      {u.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {data.attention.length > 0 ? (
            <Section title="Declined / procurement failed">
              <ul className="space-y-2">
                {data.attention.map((a) => (
                  <li key={a.id} className="rounded-lg bg-red-50/80 border border-red-100 px-2 py-1.5">
                    <Link
                      to={
                        isFaculty()
                          ? `${basePath}/request-history?requestId=${a.id}`
                          : `${basePath}/request-history?status=notifications&requestId=${a.id}`
                      }
                      onClick={() => onAttentionLineClick(a.id)}
                      className="text-sm font-medium text-red-950 hover:underline line-clamp-1"
                    >
                      {a.label}
                    </Link>
                    <p className="text-xs text-red-900/90 mt-0.5 line-clamp-3">{a.reason}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{a.status}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {isDeptHead() && registrationBadgeActive ? (
            <Section title="Registration approvals">
              <p className="text-xs text-gray-600 mb-2">
                {data.pendingRegistrations} pending applicant
                {data.pendingRegistrations === 1 ? '' : 's'} for your college.
              </p>
              <Link
                to="/dept-head/registration-requests"
                onClick={() => onRegistrationSectionClick()}
                className="inline-flex text-sm font-medium text-red-900 hover:underline"
              >
                Open registration requests →
              </Link>
            </Section>
          ) : null}

          {badgeCount === 0 && !loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">You&apos;re all caught up.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
