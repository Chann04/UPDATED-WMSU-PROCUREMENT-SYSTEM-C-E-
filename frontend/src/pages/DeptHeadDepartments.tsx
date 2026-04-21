import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegesAPI, profilesQueryAPI, requestsAPI } from '../lib/supabaseApi';
import type { College, Profile, RequestWithRelations } from '../types/database';
import { Building2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type DepartmentSummary = {
  name: string;
  users: Profile[];
  contact: Profile | null;
  requestCount: number;
  pendingCount: number;
  activeCount: number;
  totalRequested: number;
};

const peso = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function DeptHeadDepartments() {
  const { profile } = useAuth();
  const [college, setCollege] = useState<College | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!profile?.id) return;
      setLoading(true);
      setError('');
      try {
        const allColleges = await collegesAPI.getAll();
        const handled = allColleges.find((c) => c.handler_id === profile.id) ?? null;
        if (!mounted) return;
        setCollege(handled);
        if (!handled?.name) {
          setProfiles([]);
          setRequests([]);
          return;
        }
        const [rows, reqRows] = await Promise.all([
          profilesQueryAPI.getByDepartment(handled.name),
          requestsAPI.getForHandledCollege(profile.id).then((r) => r.requests),
        ]);
        if (!mounted) return;
        setProfiles(rows);
        setRequests(reqRows);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load departments.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const departments = useMemo<DepartmentSummary[]>(() => {
    const byDepartment = new Map<string, Profile[]>();
    profiles.forEach((p) => {
      const department = p.faculty_department?.trim() || '';
      if (!department) return;
      if (!byDepartment.has(department)) byDepartment.set(department, []);
      byDepartment.get(department)!.push(p);
    });

    const committedStatuses = ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'];
    return Array.from(byDepartment.entries())
      .map(([name, users]) => {
        const departmentRequests = requests.filter(
          (r) => (r.requester?.faculty_department || '').trim() === name
        );
        const contact =
          users.find((u) => u.role === 'DeptHead') ||
          users.slice().sort((a, b) => a.full_name.localeCompare(b.full_name))[0] ||
          null;
        return {
          name,
          users: users.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)),
          contact,
          requestCount: departmentRequests.length,
          pendingCount: departmentRequests.filter((r) => r.status === 'Pending').length,
          activeCount: departmentRequests.filter((r) => committedStatuses.includes(r.status)).length,
          totalRequested: departmentRequests.reduce((sum, r) => sum + Number(r.total_price || 0), 0),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, requests]);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-base text-gray-500 mt-1">
            Expand a department to inspect users, request load, and budget demand.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Handling College</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-900" />
              {college?.name || profile?.department || 'Not assigned yet'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requests</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Budget Demand</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Details</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No departments found for this college yet.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => {
                    const isOpen = expandedDepartment === d.name;
                    return (
                      <Fragment key={d.name}>
                        <tr className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {d.contact?.full_name || 'No contact assigned'}
                            {d.contact?.email ? (
                              <span className="block text-xs text-gray-500">{d.contact.email}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className="font-medium">{d.requestCount}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              Pending {d.pendingCount} · Active {d.activeCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{peso(d.totalRequested)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDepartment((prev) => (prev === d.name ? null : d.name))
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isOpen ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="border-t border-gray-100 bg-gray-50/70">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-600 uppercase">
                                  Department Users ({d.users.length})
                                </p>
                                {d.users.length === 0 ? (
                                  <p className="text-sm text-gray-500">No users assigned yet.</p>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex justify-end">
                                      <Link
                                        to={`/dept-head/request-history?department=${encodeURIComponent(d.name)}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50"
                                      >
                                        Open requests for this department
                                      </Link>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {d.users.map((u) => (
                                        <div
                                          key={u.id}
                                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                        >
                                          <p className="font-medium text-gray-900">{u.full_name}</p>
                                          <p className="text-gray-600">{u.email}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            Role: {u.role} · Status: {u.status || 'Approved'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
