import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { Wallet } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

interface BudgetUtilizationDonutProps {
  /** Total allocated budget for the college / department. */
  budgetTotal: number;
  /** Requests that draw from this budget. */
  requests: RequestWithRelations[];
  /** Optional custom title. Defaults to "Budget Utilization". */
  title?: string;
}

type Segment = {
  key: 'spent' | 'inProgress' | 'remaining';
  name: string;
  value: number;
  color: string;
};

const SPENT_STATUSES = new Set(['Received', 'Completed']);
const IN_PROGRESS_STATUSES = new Set(['Approved', 'Procuring', 'ProcurementDone']);

const formatPeso = (value: number) =>
  `₱${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** Donut chart showing how the allocated budget is currently being used. */
export default function BudgetUtilizationDonut({
  budgetTotal,
  requests,
  title = 'Budget Utilization',
}: BudgetUtilizationDonutProps) {
  const { segments, spent, inProgress, remaining, utilizationPct } = useMemo(() => {
    const spentAmount = requests
      .filter((r) => SPENT_STATUSES.has(r.status))
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

    const inProgressAmount = requests
      .filter((r) => IN_PROGRESS_STATUSES.has(r.status))
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

    const total = Math.max(0, Number(budgetTotal) || 0);
    const used = spentAmount + inProgressAmount;
    const remainingAmount = Math.max(0, total - used);

    const segs: Segment[] = [
      { key: 'spent', name: 'Spent (Delivered)', value: spentAmount, color: '#7f1d1d' },
      { key: 'inProgress', name: 'In Progress', value: inProgressAmount, color: '#d97706' },
      { key: 'remaining', name: 'Remaining', value: remainingAmount, color: '#e5e7eb' },
    ];

    const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

    return {
      segments: segs,
      spent: spentAmount,
      inProgress: inProgressAmount,
      remaining: remainingAmount,
      utilizationPct: pct,
    };
  }, [requests, budgetTotal]);

  const hasData = segments.some((s) => s.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Breakdown of how the allocated budget is being used.
          </p>
        </div>
        <Wallet className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="md:col-span-2 relative h-56">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={segments.filter((s) => s.value > 0).length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive
                >
                  {segments.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<BudgetTooltip total={budgetTotal} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              No budget data yet
            </div>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-500">Utilized</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">
              {utilizationPct.toFixed(1)}%
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              of {formatPeso(budgetTotal)}
            </p>
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <LegendRow color="#7f1d1d" label="Spent (Delivered)" value={spent} total={budgetTotal} />
          <LegendRow color="#d97706" label="In Progress" value={inProgress} total={budgetTotal} />
          <LegendRow color="#e5e7eb" label="Remaining" value={remaining} total={budgetTotal} />
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 text-gray-700">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          {label}
        </span>
        <span className="font-semibold text-gray-900">{formatPeso(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{pct.toFixed(1)}% of allocation</p>
    </div>
  );
}

function BudgetTooltip({
  active,
  payload,
  total,
}: TooltipProps<number, string> & { total: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = Number(entry.value || 0);
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-md border border-gray-100 text-xs">
      <p className="font-semibold text-gray-900">{entry.name}</p>
      <p className="text-gray-600 mt-0.5">{formatPeso(value)}</p>
      <p className="text-gray-400">{pct.toFixed(1)}% of allocation</p>
    </div>
  );
}
