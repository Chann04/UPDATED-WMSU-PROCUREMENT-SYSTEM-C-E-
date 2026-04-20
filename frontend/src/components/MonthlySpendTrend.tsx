import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

interface MonthlySpendTrendProps {
  requests: RequestWithRelations[];
  /** How many months to display (ending at current month). */
  months?: number;
  title?: string;
}

const SPEND_STATUSES = new Set([
  'Approved',
  'Procuring',
  'ProcurementDone',
  'Received',
  'Completed',
]);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatPeso = (value: number) => {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(1)}k`;
  return `₱${value.toLocaleString()}`;
};

export default function MonthlySpendTrend({
  requests,
  months = 12,
  title = 'Monthly Spend Trend',
}: MonthlySpendTrendProps) {
  const { data, total } = useMemo(() => {
    const buckets: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key,
        label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        value: 0,
      });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    for (const r of requests) {
      if (!SPEND_STATUSES.has(r.status)) continue;
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = bucketMap.get(key);
      if (b) b.value += Number(r.total_price || 0);
    }

    return {
      data: buckets,
      total: buckets.reduce((s, b) => s + b.value, 0),
    };
  }, [requests, months]);

  const hasData = total > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Committed spend over the last {months} months.
          </p>
        </div>
        <TrendingUp className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 h-64">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No spend activity yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7f1d1d" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={formatPeso}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<SpendTooltip />} cursor={{ stroke: '#e5e7eb' }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#7f1d1d"
                strokeWidth={2}
                fill="url(#spendGradient)"
                dot={{ r: 3, fill: '#7f1d1d' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <p className="text-xs text-gray-500 mt-2">
          Total in window: <span className="font-semibold text-gray-800">{formatPeso(total)}</span>
        </p>
      )}
    </div>
  );
}

function SpendTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = Number(entry.value || 0);
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-md border border-gray-100 text-xs">
      <p className="font-semibold text-gray-900">{entry.payload?.label}</p>
      <p className="text-gray-600 mt-0.5">
        ₱{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
