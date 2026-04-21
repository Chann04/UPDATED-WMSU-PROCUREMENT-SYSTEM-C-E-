import { useAuth } from '../context/AuthContext';
import { Building2, Mail } from 'lucide-react';

/** Home for signed-in faculty (non-admin) after login. */
export default function FacultyHome() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Department</h1>
        <p className="text-base text-gray-500 mt-1">
          Welcome to WMSU Procurement. Use the menu when your administrator adds options for your role.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-red-900">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{profile?.full_name ?? 'User'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 shrink-0" />
              {profile?.email ?? '—'}
            </p>
            {profile?.department && (
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>
                  <span className="text-gray-500">College: </span>
                  {profile.department}
                </span>
              </p>
            )}
            {profile?.faculty_department?.trim() ? (
              <p className="text-sm text-gray-600 mt-1">
                <span className="text-gray-500">Department: </span>
                {profile.faculty_department}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
