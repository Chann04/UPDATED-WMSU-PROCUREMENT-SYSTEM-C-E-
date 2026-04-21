import React, { useState, useEffect, type FormEvent } from 'react';
import { budgetsAPI, profilesAPI, collegesAPI, budgetAllocationHistoryAPI } from '../lib/supabaseApi';
import type { Budget, College, Profile } from '../types/database';
import { Loader2, Plus, Wallet, Building2, Save, X } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const isPermissionDenied = (err: any) =>
  !!err && (String(err?.message || '').toLowerCase().includes('permission denied') || err?.code === '42501');

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [year, setYear] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [allocationHistory, setAllocationHistory] = useState<
    Array<{
      id: string;
      college_id: string;
      amount: number;
      created_at: string;
      college_name: string;
      dept_head_name: string;
    }>
  >([]);

  const load = async () => {
    setError('');
    try {
      const [bRows, pRows, latest] = await Promise.all([
        budgetsAPI.getAll(),
        profilesAPI.getAll(),
        budgetsAPI.getLatestSession()
      ]);
      setBudgets(bRows);
      setProfiles(pRows);
      setCurrentBudget(latest);
      try {
        const cRows = await collegesAPI.getAll();
        setColleges(cRows.filter((c) => c.is_active));
      } catch {
        // Keep page usable if colleges table is temporarily misconfigured.
        setColleges([]);
      }

      if (latest) {
        try {
          const [historyRows, sessionRows] = await Promise.all([
            budgetAllocationHistoryAPI.getByBudgetId(latest.id),
            budgetsAPI.getDistributedByBudgetId(latest.id)
          ]);

          // Keep spent in sync with append-only history in case older data drifted.
          if (Math.abs(sessionRows - Number(latest.spent_amount || 0)) > 0.01) {
            await budgetsAPI.update(latest.id, { spent_amount: sessionRows });
          }

          setAllocationHistory(
            historyRows.map((r) => ({
              id: r.id,
              college_id: r.college_id,
              amount: Number(r.amount || 0),
              created_at: r.created_at,
              college_name: r.college?.name || 'Unknown college',
              dept_head_name: r.dept_head?.full_name || 'Unassigned'
            }))
          );
        } catch (historyErr: any) {
          if (isPermissionDenied(historyErr)) {
            // Keep page usable when table access is blocked by RLS.
            setAllocationHistory([]);
          } else {
            throw historyErr;
          }
        }
      } else {
        setAllocationHistory([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deptHeadByCollege = (college: College) => {
    // Primary source of truth: explicit assignment from Colleges page
    if (college.handler_id) {
      const assigned = profiles.find((p) => p.id === college.handler_id && p.role === 'DeptHead');
      if (assigned) return assigned;
    }
    // Backward compatibility for older rows that relied on department name matching
    return profiles.find((p) => p.department === college.name && p.role === 'DeptHead');
  };

  const handleCreateBudget = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const y = year.trim();
    const amt = parseFloat(totalAmount);
    if (!y) {
      setError('Enter an academic year (e.g. 2025-2026).');
      return;
    }
    if (Number.isNaN(amt) || amt < 0) {
      setError('Enter a valid total amount.');
      return;
    }
    setSubmitting(true);
    try {
      const previous = await budgetsAPI.getLatestSession();
      const carryOver = previous ? Math.max(0, Number(previous.remaining_amount || 0)) : 0;
      await budgetsAPI.createSession({ academic_year: y, total_amount: amt });
      setSuccess(
        carryOver > 0
          ? `Budget session started. Carry-over from previous session (₱${carryOver.toLocaleString()}) was added automatically.`
          : 'Budget session started.'
      );
      setYear('');
      setTotalAmount('');
      setShowAddBudgetModal(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const sanitizeCurrencyInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  };

  const formatCurrencyInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return '';
    const n = Number(raw);
    if (Number.isNaN(n)) return raw;
    const decimalPlaces = raw.includes('.') ? Math.min((raw.split('.')[1] || '').length, 2) : 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: 2,
    });
  };

  const handleSaveAllocations = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (!currentBudget) {
        setError('No active budget session. Add a budget first.');
        setSubmitting(false);
        return;
      }

      const rows: Array<{ college_id: string; dept_head_id: string; target_amount: number }> = [];
      for (const college of colleges) {
        const raw = allocations[college.id]?.trim() ?? '';
        const deptHead = deptHeadByCollege(college);
        const value = raw === '' ? null : parseFloat(raw);
        if (value != null && (Number.isNaN(value) || value < 0)) {
          setError(`Invalid amount for ${college.name}.`);
          setSubmitting(false);
          return;
        }
        if (value != null && value > 0 && !deptHead) {
          setError(`No College Admin assigned for ${college.name}. Create one under Users first.`);
          setSubmitting(false);
          return;
        }
        if (value != null && deptHead) {
          rows.push({
            college_id: college.id,
            dept_head_id: deptHead.id,
            target_amount: value
          });
        }
      }

      const { distributedTotal, insertedDeltaTotal, insertedDeltas } = await budgetsAPI.saveCollegeAllocationsForSession(
        currentBudget.id,
        rows
      );

      // Add only newly allocated delta to each College Admin profile budget.
      // This preserves existing remaining budget and makes new allocations additive.
      const byDeptHead = new Map<string, number>();
      for (const d of insertedDeltas) {
        byDeptHead.set(d.dept_head_id, (byDeptHead.get(d.dept_head_id) || 0) + Number(d.amount || 0));
      }
      for (const [deptHeadId, delta] of byDeptHead.entries()) {
        const existing = profiles.find((p) => p.id === deptHeadId);
        const next = Number(existing?.approved_budget || 0) + delta;
        await profilesAPI.update(deptHeadId, { approved_budget: next });
      }

      setSuccess(
        insertedDeltaTotal > 0
          ? `Allocations saved. Added ₱${insertedDeltaTotal.toLocaleString()} new distribution to this session. Session distributed total is now ₱${distributedTotal.toLocaleString()}.`
          : `No new distribution added. Session distributed total remains ₱${distributedTotal.toLocaleString()}.`
      );
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save allocations');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const next: Record<string, string> = {};
    const allocatedByCollege: Record<string, number> = {};
    for (const row of allocationHistory) {
      allocatedByCollege[row.college_id] = (allocatedByCollege[row.college_id] || 0) + Number(row.amount || 0);
    }
    const referenceTotal = currentBudget?.total_amount ?? 0;
    for (const college of colleges) {
      const alreadyAllocated = allocatedByCollege[college.id] || 0;
      if (alreadyAllocated > 0) {
        next[college.id] = String(Number(alreadyAllocated.toFixed(2)));
        continue;
      }
      const computed =
        college.allocation_mode === 'percentage'
          ? (referenceTotal * Number(college.allocation_value || 0)) / 100
          : Number(college.allocation_value || 0);
      next[college.id] = computed > 0 ? String(Number(computed.toFixed(2))) : '';
    }
    setAllocations(next);
  }, [profiles, colleges, currentBudget, allocationHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  const lifetimeTotals = budgets.reduce(
    (acc, b) => ({
      total: acc.total + Number(b.total_amount),
      spent: acc.spent + Number(b.spent_amount),
      remaining: acc.remaining + Number(b.remaining_amount),
    }),
    { total: 0, spent: 0, remaining: 0 }
  );
  const sessionSummary = currentBudget
    ? {
        total: Number(currentBudget.total_amount || 0),
        spent: Number(currentBudget.spent_amount || 0),
        remaining: Number(currentBudget.remaining_amount || 0)
      }
    : null;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const isSessionAllocationLocked = allocationHistory.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
          <p className="text-base text-gray-500 mt-1">
            Manage budget sessions and distribute to colleges. Allocation can only be submitted once per session.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setYear('');
            setTotalAmount('');
            setShowAddBudgetModal(true);
          }}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add budget
        </button>
      </div>

      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      {showAddBudgetModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !submitting && setShowAddBudgetModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-budget-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="add-budget-modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-900" />
                Add budget
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowAddBudgetModal(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total amount (₱)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Any remaining amount from the previous session will be automatically added to this amount.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyInput(totalAmount)}
                    onChange={(e) => setTotalAmount(sanitizeCurrencyInput(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-4 py-2.5 text-gray-700 hover:text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Add budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sessionSummary && (
        <section
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          aria-label="Current budget session summary"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Current session {currentBudget?.academic_year}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-red-950/5 border border-red-900/10 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Total budget</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums">₱{fmt(sessionSummary.total)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Distributed</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(sessionSummary.spent)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(sessionSummary.remaining)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            When you start a new session via Add budget, this session&apos;s remaining balance is automatically carried over.
          </p>
        </section>
      )}

      {budgets.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Lifetime totals (all sessions)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-red-950/5 border border-red-900/10 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Total budget</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums">₱{fmt(lifetimeTotals.total)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Distributed</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(lifetimeTotals.spent)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(lifetimeTotals.remaining)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-900" />
            Budget records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Academic year</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Total (₱)</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Spent (₱)</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Remaining (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No budgets yet. Use &quot;Add budget&quot; to create one.
                  </td>
                </tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{b.academic_year}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.spent_amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.remaining_amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Save className="w-5 h-5 text-red-900" />
            Allocation history (current session)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Timestamp</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">College</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">College admin</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Allocated delta (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocationHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No allocation history yet for this session.
                  </td>
                </tr>
              ) : (
                allocationHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-900 font-medium">{h.college_name}</td>
                    <td className="px-6 py-3 text-gray-700">{h.dept_head_name}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{fmt(h.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-red-900" />
          Distribute to colleges
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Set each college&apos;s allocation for the active session. After the first save, this session is locked and
          allocations can only be changed by starting a new session with Add budget.
        </p>
        {isSessionAllocationLocked && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Allocation is locked for this session because it was already submitted once. Add a new budget session to allocate again.
          </div>
        )}
        <div className="space-y-4">
          {colleges.map((college) => {
            const deptHead = deptHeadByCollege(college);
            return (
              <div key={college.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border border-gray-100 rounded-lg p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{college.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Method: {college.allocation_mode === 'percentage' ? `Percentage (${college.allocation_value}%)` : `Direct amount (₱${Number(college.allocation_value).toLocaleString()})`}
                  </p>
                  {!deptHead ? (
                    <p className="text-xs text-amber-700 mt-1">No College Admin assigned for this college yet. Create one under Users.</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 truncate">{deptHead.full_name} · {deptHead.email}</p>
                  )}
                </div>
                <div className="w-full sm:w-48">
                  <label className="sr-only">Amount (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={!deptHead || isSessionAllocationLocked}
                      value={formatCurrencyInput(allocations[college.id] ?? '')}
                      onChange={(e) =>
                        setAllocations((prev) => ({ ...prev, [college.id]: sanitizeCurrencyInput(e.target.value) }))
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {colleges.length === 0 && (
          <p className="text-sm text-amber-700 mt-4">
            No active colleges found. Add one first in the Colleges page.
          </p>
        )}
        <button
          type="button"
          onClick={handleSaveAllocations}
          disabled={submitting || isSessionAllocationLocked}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save college allocations
        </button>
      </section>
    </div>
  );
}
