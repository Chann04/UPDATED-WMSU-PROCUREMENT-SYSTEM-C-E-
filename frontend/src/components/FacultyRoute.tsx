import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, isDeptHeadRole, isFacultyUser, shouldBlockFacultyRouteForProfileLoading } from '../lib/roles';
import { Loader2 } from 'lucide-react';

/** `/faculty` is only for users whose role is Faculty (not Admin or DeptHead). */
export default function FacultyRoute() {
  const { loading, profileLoading, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (isAdminRole(profile, user)) {
    return <Navigate to="/colleges" replace />;
  }

  if (isDeptHeadRole(profile)) {
    return <Navigate to="/dept-head/dashboard" replace />;
  }

  if (shouldBlockFacultyRouteForProfileLoading(profile, user, profileLoading)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (isFacultyUser(profile, user)) {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
}
