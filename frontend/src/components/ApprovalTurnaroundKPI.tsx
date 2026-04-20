import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, type TooltipProps } from 'recharts';
import { Timer, TrendingDown, TrendingUp } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

interface ApprovalTurnaroundKPIProps {
  requests: RequestWithRelations[];
  /** Number of months for the sparkline trend. */
  months?: number;
  title?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
};

type ApprovedSample = {
  approvedAt: number;
  hours: number;
};

export default function ApprovalTurnaroundKPI({
  requests,
  months = 6,
  title = 'Approval Turnaround',
}: ApprovalTurnaroundKPIProps) {
  const { avgHours, count, trend, deltaPct } = useMemo(() => {
    const samples: ApprovedSample[] = [];
    for (const r of requests) {
      if (!r.created_at || !r.approved_at) continue;
      const created = new Date(r.created_at).getTime();
      const approved = new Date(r.approved_at).getTime();
      if (Number.isNaN(created) || Number.isNaN(approved)) continue;
      const diffMs = approved - created;
      if (diffMs <= 0) continue;
      samples.push({ approvedAt: approved, hours: diffMs / 3_600_000 });
    }

    const overallAvg =
      samples.length > 0 ? samples.reduce((s, x) => s + x.hours, 0) / samples.length : 0;

    // Monthly averages for the sparkline.
    const buckets: { key: string; label: string; sum: number; n: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key,
        label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        sum: 0,
        n: 0,
      });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    for (const s of samples) {
      const d = new Date(s.approvedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = bucketMap.get(key);
      if (b) {
        b.sum += s.hours;
        b.n += 1;
      }
    }

    const trendData = buckets.map((b) => ({
      label: b.label,
      value: b.n > 0 ? Number((b.sum / b.n).toFixed(2)) : 0,
      count: b.n,
    }));

    // Delta: most recent non-zero month vs the previous non-zero month.
    const nonZero = trendData.filter((t) => t.value > 0);
    let delta = 0;
    if (nonZero.length >= 2) {
      const latest = nonZero[nonZero.length - 1].value;
      const previous = nonZero[nonZero.length - 2].value;
      delta = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
    }

    return {
      avgHours: overallAvg,
      count: samples.length,
      trend: trendData,
      deltaPct: delta,
    };
  }, [requests, months]);

  const hasData = count > 0;
  const improving = deltaPct < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Average time from request submitted to approved.
          </p>
        </div>
        <Timer className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="md:col-span-2">
          <p className="text-xs text-gray-500">Overall average</p>
          <p className="text-3xl font-bold text-gray-900 leading-tight mt-1">
            {hasData ? formatDuration(avgHours) : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on {count} approved request{count === 1 ? '' : 's'}
          </p>
          {hasData && Math.abs(deltaPct) > 0.5 && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                improving
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {improving ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              {Math.abs(deltaPct).toFixed(1)}% vs prior month
            </div>
          )}
        </div>

        <div className="md:col-span-3 h-28">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="turnaroundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7f1d1d" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Tooltip content={<TurnaroundTooltip />} cursor={{ stroke: '#e5e7eb' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7f1d1d"
                  strokeWidth={2}
                  fill="url(#turnaroundGradient)"
                  dot={{ r: 2.5, fill: '#7f1d1d' }}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              Not enough data for trend
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnaroundTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = Number(entry.value || 0);
  const count = Number(entry.payload?.count || 0);
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-md border border-gray-100 text-xs">
      <p className="font-semibold text-gray-900">{entry.payload?.label}</p>
      <p className="text-gray-600 mt-0.5">Avg: {formatDuration(value)}</p>
      <p className="text-gray-400">
        {count} approval{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}
