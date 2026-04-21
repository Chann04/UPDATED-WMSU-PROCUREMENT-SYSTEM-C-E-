import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, isDeptHeadUser } from '../lib/roles';
import { Loader2 } from 'lucide-react';

/** `/dept-head` is only for users with DeptHead role. */
export default function DeptHeadRoute() {
  const { loading, profileLoading, profile, user } = useAuth();

  if (loading || (profileLoading && user)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (isAdminRole(profile, user)) {
    return <Navigate to="/colleges" replace />;
  }

  if (isDeptHeadUser(profile)) {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
}
