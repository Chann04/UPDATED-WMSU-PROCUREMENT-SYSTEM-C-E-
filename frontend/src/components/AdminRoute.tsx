import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, isDeptHeadRole, jwtSaysAdmin } from '../lib/roles';
import { Loader2 } from 'lucide-react';

/** Wraps routes that only Admin may access. */
export default function AdminRoute() {
  const { loading, profileLoading, profile, user } = useAuth();
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    if (!user || profile || profileLoading) {
      setGraceExpired(false);
      return;
    }
    // If profile fetch stalled and is still resolving in background, avoid redirect bouncing.
    const t = setTimeout(() => setGraceExpired(true), 8000);
    return () => clearTimeout(t);
  }, [user, profile, profileLoading]);

  // profile fetch times out in AuthContext so profileLoading cannot hang forever
  if (loading || (profileLoading && user)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  // Keep spinner briefly when we have a session but profile row has not arrived yet.
  if (user && !profile && !graceExpired) {
    // If JWT does NOT say admin, don't hang on admin pages — redirect immediately.
    if (!jwtSaysAdmin(user)) {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  // After grace period, trust admin JWT to avoid accidental logout on refresh.
  if (user && !profile && jwtSaysAdmin(user)) {
    return <Outlet />;
  }

  if (!isAdminRole(profile, user)) {
    if (isDeptHeadRole(profile)) {
      return <Navigate to="/dept-head/dashboard" replace />;
    }
    // Never bounce admin pages through /faculty during refresh races.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
