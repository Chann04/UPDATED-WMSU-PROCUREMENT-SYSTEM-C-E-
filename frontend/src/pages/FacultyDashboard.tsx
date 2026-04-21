import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { Bell, Building2, Loader2, PlusCircle } from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await requestsAPI.getMyRequests();
        if (!mounted) return;
        setRequests(data);
      } catch {
        if (!mounted) return;
        setRequests([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const notifications = useMemo(
    () => requests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [requests]
  );
  const newRequests = useMemo(
    () => requests.filter((r) => ['Draft', 'Pending'].includes(r.status)).length,
    [requests]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Department Dashboard</h1>
        <p className="text-base text-gray-500 mt-1">Notifications and quick actions.</p>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div>
              <p className="text-sm text-gray-500">College</p>
              <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-900" />
                {profile?.department || 'Not set'}
              </p>
            </div>
            {profile?.faculty_department?.trim() ? (
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-base font-medium text-gray-900 mt-0.5">{profile.faculty_department}</p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/faculty/request-history" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Notification</p>
                <Bell className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{notifications}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected / Procurement failed</p>
            </Link>

            <Link to="/faculty/new-request" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">New Request View</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{newRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Draft / Pending</p>
            </Link>
          </div>

          <AnalyticsPanel
            requests={requests}
            subheading="A visual summary of your own procurement requests."
          />
        </>
      )}
    </div>
  );
}
