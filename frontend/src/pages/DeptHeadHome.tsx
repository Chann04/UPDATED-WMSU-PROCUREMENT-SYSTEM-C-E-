import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { collegesAPI, requestsAPI } from '../lib/supabaseApi';
import type { College, RequestWithRelations } from '../types/database';
import { Bell, Building2, Loader2, PlusCircle, Wallet } from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';

/** Home for signed-in DeptHead users. */
export default function DeptHeadHome() {
  const { profile } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loadingCollege, setLoadingCollege] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadCollege = async () => {
      setLoadingCollege(true);
      try {
        const data = await collegesAPI.getAll();
        if (!mounted) return;
        setColleges(data);
      } catch {
        if (!mounted) return;
        setColleges([]);
      } finally {
        if (mounted) setLoadingCollege(false);
      }
    };
    
    const loadRequests = async () => {
      setLoadingRequests(true);
      try {
        if (!profile?.id) {
          if (!mounted) return;
          setRequests([]);
          return;
        }
        const { requests: data } = await requestsAPI.getForHandledCollege(profile.id);
        if (!mounted) return;
        setRequests(data);
      } catch {
        if (!mounted) return;
        setRequests([]);
      } finally {
        if (mounted) setLoadingRequests(false);
      }
    };
    void loadCollege();
    void loadRequests();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const handledCollege = useMemo(() => {
    if (!profile?.id) return null;
    return colleges.find((c) => c.handler_id === profile.id) ?? null;
  }, [colleges, profile?.id]);

  const budgetTotal = Number(profile?.approved_budget || 0);
  const committed = useMemo(
    () =>
      requests
        .filter((r) =>
          ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'].includes(r.status)
        )
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    [requests]
  );
  const budgetRemaining = Math.max(0, budgetTotal - committed);
  const notifications = useMemo(
    () => requests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [requests]
  );
  const newRequests = useMemo(
    () => requests.filter((r) => r.status === 'Pending').length,
    [requests]
  );
  const isLoading = loadingCollege || loadingRequests;

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">College Admin Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">
            Normal dashboard view for budget, notifications, and request updates.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Handling College</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-900" />
              {handledCollege?.name || profile?.department || 'Not assigned yet'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/dept-head/budget" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Budget</p>
                <Wallet className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">₱{budgetRemaining.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Remaining from ₱{budgetTotal.toLocaleString()} allocation
              </p>
            </Link>

            <Link to="/dept-head/request-history?view=notifications" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Notification</p>
                <Bell className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{notifications}</p>
              <p className="text-xs text-gray-500 mt-1">Items need your attention</p>
            </Link>

            <Link to="/dept-head/request-history?view=new" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">New Request View</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{newRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Pending requests only</p>
            </Link>
          </div>

          <AnalyticsPanel
            requests={requests}
            budgetTotal={budgetTotal}
            subheading="Budget utilization, pipeline health, spend trend, and top categories for your college."
          />


          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link to="/dept-head/budget" className="px-4 py-2 rounded-lg bg-red-900 text-white text-sm hover:bg-red-800">
                Open Budget
              </Link>
              <Link to="/dept-head/request-history" className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Open Requests & History
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
