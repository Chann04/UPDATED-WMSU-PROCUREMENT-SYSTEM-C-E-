import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel, normalizeUserRole } from '../lib/roles';
import { useEffect, useState } from 'react';
import { commentsAPI, integrityAPI, requestsAPI } from '../lib/supabaseApi';
import { getRequestChatReadAt } from '../lib/chatUnread';
import { requestAllowsChat } from '../lib/chatPolicy';
import {
  LogOut,
  X,
  Wallet,
  ScrollText,
  Building2,
  Layers,
  LayoutDashboard,
  History,
  PlusCircle,
  UserPlus,
} from 'lucide-react';

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const { profile, user, signOut, isAdmin } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const navItems: Array<{ name: string; icon: typeof Wallet; path: string; roles: string[] }> = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: ['Admin'] },
    { name: 'Budget', icon: Wallet, path: '/budget', roles: ['Admin'] },
    { name: 'Colleges', icon: Building2, path: '/colleges', roles: ['Admin'] },
    { name: 'Logs', icon: ScrollText, path: '/logs', roles: ['Admin'] },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dept-head/dashboard', roles: ['DeptHead'] },
    { name: 'Budget', icon: Wallet, path: '/dept-head/budget', roles: ['DeptHead'] },
    { name: 'Departments', icon: Layers, path: '/dept-head/departments', roles: ['DeptHead'] },
    {
      name: 'Registration Requests',
      icon: UserPlus,
      path: '/dept-head/registration-requests',
      roles: ['DeptHead'],
    },
    { name: 'Request & History', icon: History, path: '/dept-head/request-history', roles: ['DeptHead'] },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/faculty/dashboard', roles: ['Faculty'] },
    { name: 'New Request', icon: PlusCircle, path: '/faculty/new-request', roles: ['Faculty'] },
    { name: 'Request & History', icon: History, path: '/faculty/request-history', roles: ['Faculty'] },
  ];

  const meta = user?.user_metadata as { full_name?: string; role?: string } | undefined;
  const displayName =
    profile?.full_name?.trim() ||
    meta?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'User';

  // Don’t show “Loading…” forever — use profile when ready, else JWT hints + isAdmin() (same as routes)
  const displayRole = profile
    ? normalizeUserRole(profile.role)
    : isAdmin()
      ? 'Admin'
      : meta?.role
        ? normalizeUserRole(meta.role)
        : 'Faculty';

  const filteredNavItems = navItems.filter((item) => item.roles.includes(displayRole));

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      if (!profile?.id) {
        if (!cancelled) setUnreadChatCount(0);
        return;
      }
      try {
        const requests =
          displayRole === 'Faculty'
            ? await requestsAPI.getMyRequests()
            : displayRole === 'DeptHead'
              ? (await requestsAPI.getForHandledCollege(profile.id)).requests
              : [];
        if (!requests.length) {
          if (!cancelled) setUnreadChatCount(0);
          return;
        }
        const ids = requests.map((r) => r.id);
        const latest = await commentsAPI.getLatestByRequestIds(ids);
        const adminEdited = ids.length ? await integrityAPI.getRequestIdsWithAdminEdit(ids) : new Set<string>();
        const unread = requests.reduce((count, r) => {
          const latestAt = latest[r.id];
          if (!latestAt) return count;
          if (!requestAllowsChat(r.status, adminEdited.has(r.id))) return count;
          const readAt = getRequestChatReadAt(profile.id, r.id);
          return !readAt || new Date(latestAt).getTime() > new Date(readAt).getTime() ? count + 1 : count;
        }, 0);
        if (!cancelled) setUnreadChatCount(unread);
      } catch {
        if (!cancelled) setUnreadChatCount(0);
      }
    };
    void loadUnread();
    const onChatRead = () => void loadUnread();
    window.addEventListener('wmsu-chat-read-updated', onChatRead);
    const interval = window.setInterval(() => void loadUnread(), 45_000);
    return () => {
      cancelled = true;
      window.removeEventListener('wmsu-chat-read-updated', onChatRead);
      window.clearInterval(interval);
    };
  }, [displayRole, profile?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Backdrop (mobile only) */}
      <button
        type="button"
        onClick={() => onClose?.()}
        aria-label="Close menu"
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed left-0 top-24 bottom-0 w-64 max-w-[85vw] bg-red-900 text-white flex flex-col shadow-2xl z-30 transform transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-end p-2 md:hidden">
          <button
            type="button"
            onClick={() => onClose?.()}
            className="p-2 rounded-lg text-red-100 hover:bg-red-800 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <ul className="space-y-2 px-3">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? 'rounded-none bg-red-950 text-white font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                        : 'rounded-lg text-red-100 hover:bg-red-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm md:text-base">{item.name}</span>
                  {(item.name === 'Request & History' && unreadChatCount > 0) ? (
                    <span className="ml-auto inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-white text-red-900 text-[11px] font-bold px-1.5">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-red-700/50 bg-red-950">
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-lg bg-red-900/50">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center border-2 border-red-700 shadow-sm">
            <span className="text-xs sm:text-sm font-bold text-gray-900">
              {(displayName.charAt(0) || '?').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs sm:text-sm truncate text-white">{displayName}</p>
            <p className="text-[10px] sm:text-xs text-red-200">{formatRoleLabel(displayRole)}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-red-100 hover:bg-red-800 hover:text-white transition-all duration-200 border border-red-700/50 hover:border-red-600 hover:shadow-sm text-sm md:text-base"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;

