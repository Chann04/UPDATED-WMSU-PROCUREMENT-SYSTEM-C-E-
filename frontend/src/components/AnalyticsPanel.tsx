import React, { useMemo, useState } from 'react';
import BudgetUtilizationDonut from './BudgetUtilizationDonut';
import RequestsByStatusBar from './RequestsByStatusBar';
import MonthlySpendTrend from './MonthlySpendTrend';
import TopCategoriesBar from './TopCategoriesBar';
import AgingOfPendingBar from './AgingOfPendingBar';
import ApprovalTurnaroundKPI from './ApprovalTurnaroundKPI';
import type { RequestWithRelations } from '../types/database';

export type AnalyticsDateRange = 'all' | '30d' | '90d' | '365d';

interface AnalyticsPanelProps {
  requests: RequestWithRelations[];
  /**
   * Total allocated budget for context. When omitted or 0 the budget donut is hidden,
   * which is appropriate for roles that don't manage a budget (e.g. Faculty).
   */
  budgetTotal?: number;
  /** Section heading shown above the charts. */
  heading?: string;
  /** Subtitle under the heading. */
  subheading?: string;
  /** How many categories to show in the Top Categories chart. */
  topCategories?: number;
  /** Initial selection for the date-range filter. Defaults to 'all'. */
  initialRange?: AnalyticsDateRange;
}

const RANGE_OPTIONS: { value: AnalyticsDateRange; label: string; days: number | null; months: number }[] = [
  { value: '30d', label: 'Last 30 days', days: 30, months: 2 },
  { value: '90d', label: 'Last 90 days', days: 90, months: 3 },
  { value: '365d', label: 'Last 365 days', days: 365, months: 12 },
  { value: 'all', label: 'All time', days: null, months: 12 },
];

/**
 * Reusable analytics section composed of procurement charts.
 *
 * Design choices:
 * - The date-range filter only affects time-scoped charts (pipeline, spend trend,
 *   top categories, approval turnaround). The Budget Donut and Aging of Pending
 *   always reflect the current state so the numbers match what users see elsewhere.
 * - The Budget Donut is hidden when no `budgetTotal` is provided so Faculty (who
 *   don't manage a budget) see a clean 5-chart layout.
 */
export default function AnalyticsPanel({
  requests,
  budgetTotal,
  heading = 'Analytics',
  subheading,
  topCategories = 5,
  initialRange = 'all',
}: AnalyticsPanelProps) {
  const [range, setRange] = useState<AnalyticsDateRange>(initialRange);

  const showBudget = typeof budgetTotal === 'number' && budgetTotal > 0;
  const activeOption = RANGE_OPTIONS.find((o) => o.value === range) ?? RANGE_OPTIONS[3];

  const scopedRequests = useMemo(() => {
    if (activeOption.days === null) return requests;
    const cutoff = Date.now() - activeOption.days * 86_400_000;
    return requests.filter((r) => {
      if (!r.created_at) return false;
      const t = new Date(r.created_at).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [requests, activeOption.days]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
          {subheading ? (
            <p className="text-sm text-gray-500 mt-0.5">{subheading}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="analytics-range" className="text-xs text-gray-500">
            Date range
          </label>
          <select
            id="analytics-range"
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsDateRange)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: core overview. Budget Donut + Requests by Status side-by-side,
          then spend trend and top categories on the next row of the grid. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showBudget ? (
          <BudgetUtilizationDonut
            budgetTotal={budgetTotal as number}
            requests={requests}
          />
        ) : null}
        <RequestsByStatusBar requests={scopedRequests} />
        <MonthlySpendTrend requests={scopedRequests} months={activeOption.months} />
        <TopCategoriesBar requests={scopedRequests} topN={topCategories} />
      </div>

      {/* Row 2: efficiency signals. Aging stays unfiltered (current snapshot);
          turnaround respects the selected window. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgingOfPendingBar requests={requests} />
        <ApprovalTurnaroundKPI
          requests={scopedRequests}
          months={activeOption.months}
        />
      </div>
    </section>
  );
}
