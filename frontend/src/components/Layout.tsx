import { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import HeaderNotifications from './HeaderNotifications';
import { CircleHelp, Loader2, Menu } from 'lucide-react';

const Layout = () => {
  const { isAuthenticated, loading, isAdmin, isDeptHead } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const helpHref = isAdmin() ? '/admin-help' : isDeptHead() ? '/dept-head/help' : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-900 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width header: logo + contact (same height as logo section) */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-red-950 border-b border-red-700/50 text-white flex items-center justify-between gap-2 sm:gap-4 pl-4 pr-4 sm:pl-10 sm:pr-6 z-30 shadow-md min-h-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-lg text-white hover:bg-red-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-7 h-7" />
          </button>
          <img
            src="/wmsu1.jpg"
            alt="WMSU Logo"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="font-sans font-bold text-lg sm:text-2xl leading-tight text-white truncate">Western Mindanao State University</h1>
            <p className="text-sm sm:text-base leading-tight text-red-200">WMSU-Procurement</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 text-xs sm:text-sm flex-shrink-0 flex-wrap justify-end">
          <HeaderNotifications />
          {helpHref && (
            <Link
              to={helpHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600/70 text-red-100 hover:bg-red-800 transition-colors whitespace-nowrap"
            >
              <CircleHelp className="w-4 h-4" />
              Help
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-3 md:gap-6">
            <span className="whitespace-nowrap">📞 991-1771</span>
            <span className="whitespace-nowrap">✉️ procurement@wmsu.edu.ph</span>
            <div className="text-xs text-red-200 whitespace-nowrap">ISO 9001-2015</div>
          </div>
        </div>
      </header>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 pt-24 sm:pt-32 px-4 sm:px-6 md:px-10 pb-12">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

