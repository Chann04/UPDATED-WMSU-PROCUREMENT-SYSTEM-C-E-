import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  type TooltipProps,
} from 'recharts';
import { Clock } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

interface AgingOfPendingBarProps {
  /** Unfiltered request set — aging is a current-state snapshot. */
  requests: RequestWithRelations[];
  title?: string;
}

type Bucket = {
  label: string;
  /** Inclusive lower bound in days. */
  min: number;
  /** Exclusive upper bound in days. Use Infinity for the last bucket. */
  max: number;
  color: string;
};

const BUCKETS: Bucket[] = [
  { label: '0–2 days', min: 0, max: 3, color: '#16a34a' },
  { label: '3–5 days', min: 3, max: 6, color: '#eab308' },
  { label: '6–10 days', min: 6, max: 11, color: '#ea580c' },
  { label: '>10 days', min: 11, max: Infinity, color: '#b91c1c' },
];

export default function AgingOfPendingBar({
  requests,
  title = 'Aging of Pending Requests',
}: AgingOfPendingBarProps) {
  const { data, total, oldest } = useMemo(() => {
    const now = Date.now();
    const ageDaysList = requests
      .filter((r) => r.status === 'Pending' && r.created_at)
      .map((r) => {
        const t = new Date(r.created_at).getTime();
        if (Number.isNaN(t)) return null;
        return Math.max(0, Math.floor((now - t) / 86_400_000));
      })
      .filter((n): n is number => n !== null);

    const counts = BUCKETS.map((b) => ({
      label: b.label,
      value: ageDaysList.filter((d) => d >= b.min && d < b.max).length,
      color: b.color,
    }));

    return {
      data: counts,
      total: ageDaysList.length,
      oldest: ageDaysList.length > 0 ? Math.max(...ageDaysList) : 0,
    };
  }, [requests]);

  const maxValue = data.reduce((m, d) => Math.max(m, d.value), 0);
  const hasData = total > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            How long pending requests have been waiting for action.
          </p>
        </div>
        <Clock className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 h-56">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No pending requests
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
              barSize={18}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, Math.max(1, Math.ceil(maxValue * 1.1))]}
                hide
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: '#4b5563' }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<AgingTooltip total={total} />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  className="fill-gray-700"
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <p className="text-xs text-gray-500 mt-2">
          Total pending: <span className="font-semibold text-gray-800">{total}</span>
          {' '}· Oldest: <span className="font-semibold text-gray-800">{oldest} day{oldest === 1 ? '' : 's'}</span>
        </p>
      )}
    </div>
  );
}

function AgingTooltip({
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
      <p className="font-semibold text-gray-900">{entry.payload?.label}</p>
      <p className="text-gray-600 mt-0.5">
        {value} pending ({pct.toFixed(1)}%)
      </p>
    </div>
  );
}
