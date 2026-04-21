import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  type TooltipProps,
} from 'recharts';
import { Tag } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

interface TopCategoriesBarProps {
  requests: RequestWithRelations[];
  /** How many categories to display. Defaults to 5. */
  topN?: number;
  title?: string;
}

const SPEND_STATUSES = new Set([
  'Approved',
  'Procuring',
  'ProcurementDone',
  'Received',
  'Completed',
]);

const formatPeso = (value: number) => {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(1)}k`;
  return `₱${value.toLocaleString()}`;
};

export default function TopCategoriesBar({
  requests,
  topN = 5,
  title = 'Top Categories by Spend',
}: TopCategoriesBarProps) {
  const { data, total, grandTotal } = useMemo(() => {
    const agg = new Map<string, { label: string; value: number; count: number }>();
    let grand = 0;
    for (const r of requests) {
      if (!SPEND_STATUSES.has(r.status)) continue;
      const amount = Number(r.total_price || 0);
      if (amount <= 0) continue;
      const label = r.category?.name || 'Uncategorized';
      const existing = agg.get(label);
      if (existing) {
        existing.value += amount;
        existing.count += 1;
      } else {
        agg.set(label, { label, value: amount, count: 1 });
      }
      grand += amount;
    }
    const sorted = Array.from(agg.values()).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, topN);
    return {
      data: top,
      total: top.reduce((s, d) => s + d.value, 0),
      grandTotal: grand,
    };
  }, [requests, topN]);

  const maxValue = data.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Categories absorbing the most committed spend.
          </p>
        </div>
        <Tag className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No category spend yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 60, bottom: 4, left: 8 }}
              barSize={18}
            >
              <XAxis
                type="number"
                domain={[0, Math.max(1, Math.ceil(maxValue * 1.15))]}
                tickFormatter={formatPeso}
                hide
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: '#4b5563' }}
                axisLine={false}
                tickLine={false}
                width={130}
              />
              <Tooltip content={<CategoryTooltip grandTotal={grandTotal} />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" fill="#7f1d1d" radius={[0, 6, 6, 0]}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => formatPeso(Number(v))}
                  className="fill-gray-700"
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {grandTotal > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Top {data.length}:{' '}
          <span className="font-semibold text-gray-800">{formatPeso(total)}</span>
          {' '}of{' '}
          <span className="font-semibold text-gray-800">{formatPeso(grandTotal)}</span>
          {' '}total committed
        </p>
      )}
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
  grandTotal,
}: TooltipProps<number, string> & { grandTotal: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = Number(entry.value || 0);
  const count = Number(entry.payload?.count || 0);
  const pct = grandTotal > 0 ? (value / grandTotal) * 100 : 0;
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-md border border-gray-100 text-xs">
      <p className="font-semibold text-gray-900">{entry.payload?.label}</p>
      <p className="text-gray-600 mt-0.5">
        ₱{value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({pct.toFixed(1)}%)
      </p>
      <p className="text-gray-400">
        {count} request{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}
