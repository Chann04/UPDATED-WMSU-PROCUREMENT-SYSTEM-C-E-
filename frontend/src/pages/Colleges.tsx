import { useEffect, useMemo, useState } from 'react';
import { collegesAPI, profilesQueryAPI } from '../lib/supabaseApi';
import type { College, Profile } from '../types/database';
import {
  Loader2,
  Building2,
  X,
  Eye,
  User,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const PAGE_SIZE = 10;

export default function Colleges() {
  const [rows, setRows] = useState<College[]>([]);
  const [deptHeads, setDeptHeads] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewing, setViewing] = useState<College | null>(null);
  const [page, setPage] = useState(1);

  const formatAdminName = (p: Profile): string => {
    const first = p.first_name?.trim() || '';
    const middle = p.middle_initial?.trim() || '';
    const last = p.family_name?.trim() || '';
    const composed = [first, middle, last].filter(Boolean).join(' ').trim();
    return composed || p.full_name?.trim() || '';
  };

  const getCollegeAdmin = (c: College): Profile | null => {
    if (!c.handler_id) return null;
    return deptHeads.find((u) => u.id === c.handler_id) ?? null;
  };

  /** App-level status rule: a college is Active only when a College Admin is linked. */
  const isCollegeActive = (c: College): boolean => Boolean(c.handler_id);

  const load = async () => {
    setError('');
    try {
      // Ensure the canonical WMSU college list exists; ignored if already seeded.
      try {
        await collegesAPI.ensureDefaults();
      } catch (seedErr: any) {
        console.warn('[Colleges] ensureDefaults skipped:', seedErr?.message);
      }

      const [data, heads] = await Promise.all([
        collegesAPI.getAll(),
        profilesQueryAPI.getByRole('DeptHead'),
      ]);
      setRows(data);
      setDeptHeads(heads);
    } catch (e: any) {
      setError(e?.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, rows.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Colleges</h1>
        <p className="text-base text-gray-500 mt-1">
          View registered colleges and their assigned College Admins.
        </p>
      </div>

      <CenteredAlert
        error={error || undefined}
        success={success || undefined}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      />

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College Head</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No colleges yet.
                </td>
              </tr>
            ) : (
              pageRows.map((c) => {
                const admin = getCollegeAdmin(c);
                const active = isCollegeActive(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-red-900" />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {admin ? (
                        <span className="text-gray-700">{formatAdminName(admin) || '—'}</span>
                      ) : (
                        <span className="italic text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {active ? 'Active' : 'Not Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-24">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setViewing(c)}
                          className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                          title="View college details"
                          aria-label={`View details for ${c.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            <p>
              Showing <span className="font-medium text-gray-900">{rangeStart}</span>–
              <span className="font-medium text-gray-900">{rangeEnd}</span> of{' '}
              <span className="font-medium text-gray-900">{rows.length}</span> colleges
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-gray-700">
                Page <span className="font-semibold text-gray-900">{safePage}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {viewing && (() => {
        const admin = getCollegeAdmin(viewing);
        const active = isCollegeActive(viewing);
        return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="presentation"
            onClick={() => setViewing(null)}
          >
            <div
              className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-red-900/10 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="college-details-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-red-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="college-details-title" className="text-lg font-semibold leading-tight">
                      {viewing.name}
                    </h3>
                    <p className="text-xs text-red-100 mt-0.5">College Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="p-2 hover:bg-red-800 rounded-lg transition-colors"
                  aria-label="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {active ? 'Active' : 'Not Active'}
                  </span>
                  {!active && (
                    <p className="text-xs text-gray-500 mt-2">
                      Status becomes Active once a College Admin is assigned.
                    </p>
                  )}
                </div>

                <section className="rounded-xl border border-red-900/15 bg-gradient-to-br from-red-50 to-white overflow-hidden">
                  <header className="flex items-center gap-2 px-5 py-3 bg-red-900/5 border-b border-red-900/10">
                    <ShieldCheck className="w-4 h-4 text-red-900" />
                    <h4 className="text-sm font-semibold text-red-900 uppercase tracking-wide">
                      College Admin
                    </h4>
                  </header>
                  <div className="px-5 py-4">
                    {admin ? (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-900 text-white rounded-full flex items-center justify-center font-semibold shadow-sm">
                          {(formatAdminName(admin).charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-gray-900">
                            <User className="w-4 h-4 text-red-900 flex-shrink-0" />
                            <p className="font-semibold truncate">{formatAdminName(admin) || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4 text-red-900 flex-shrink-0" />
                            <a
                              href={`mailto:${admin.email}`}
                              className="truncate hover:text-red-900 hover:underline"
                            >
                              {admin.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">No Admin Assigned</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            This college does not have a College Admin yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
