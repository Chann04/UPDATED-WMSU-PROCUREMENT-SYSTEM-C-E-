import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetsAPI, collegesAPI, requestsAPI } from '../lib/supabaseApi';
import type { Budget, College, RequestWithRelations } from '../types/database';
import {
  Bell,
  Building2,
  Loader2,
  PlusCircle,
  ScrollText,
  Wallet,
} from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';

/** System-wide dashboard for Admin users. */
export default function AdminDashboard() {
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [reqRows, collegeRows, latestBudget] = await Promise.all([
          requestsAPI.getAll().catch(() => []),
          collegesAPI.getAll().catch(() => []),
          budgetsAPI.getLatestSession().catch(() => null),
        ]);
        if (!mounted) return;
        setRequests(reqRows);
        setColleges((collegeRows || []).filter((c) => c.is_active));
        setCurrentBudget(latestBudget);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const budgetTotal = Number(currentBudget?.total_amount || 0);
  const budgetRemaining = Number(currentBudget?.remaining_amount || 0);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'Pending').length,
    [requests]
  );
  const notificationsCount = useMemo(
    () => requests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [requests]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-base text-gray-500 mt-1">
          System-wide overview of procurement activity across all colleges.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Current Budget Session</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-900" />
              {currentBudget?.academic_year
                ? `AY ${currentBudget.academic_year}`
                : 'No active session'}
            </p>
            {currentBudget ? (
              <p className="text-xs text-gray-500 mt-1">
                Remaining ₱{budgetRemaining.toLocaleString()} of ₱{budgetTotal.toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/budget"
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Budget</p>
                <Wallet className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">
                ₱{budgetRemaining.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Remaining from ₱{budgetTotal.toLocaleString()} allocation
              </p>
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Pending Requests</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Attention Items</p>
                <Bell className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{notificationsCount}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected / Procurement failed</p>
            </div>

            <Link
              to="/colleges"
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Active Colleges</p>
                <Building2 className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{colleges.length}</p>
              <p className="text-xs text-gray-500 mt-1">Managed colleges</p>
            </Link>
          </div>

          <AnalyticsPanel
            requests={requests}
            budgetTotal={budgetTotal}
            subheading="System-wide procurement analytics across all colleges."
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link
                to="/budget"
                className="px-4 py-2 rounded-lg bg-red-900 text-white text-sm hover:bg-red-800 inline-flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Manage Budget
              </Link>
              <Link
                to="/colleges"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Manage Colleges
              </Link>
              <Link
                to="/logs"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <ScrollText className="w-4 h-4" />
                View Activity Logs
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
