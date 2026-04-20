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
import { ListChecks } from 'lucide-react';
import type { RequestStatus, RequestWithRelations } from '../types/database';

interface RequestsByStatusBarProps {
  requests: RequestWithRelations[];
  title?: string;
}

/** Pipeline order from newest to final state. Draft is intentionally excluded. */
const PIPELINE: { status: RequestStatus; label: string; color: string }[] = [
  { status: 'Pending', label: 'Pending', color: '#64748b' },
  { status: 'Approved', label: 'Approved', color: '#2563eb' },
  { status: 'Procuring', label: 'Procuring', color: '#0891b2' },
  { status: 'ProcurementDone', label: 'Procurement Done', color: '#0d9488' },
  { status: 'Received', label: 'Received', color: '#16a34a' },
  { status: 'Completed', label: 'Completed', color: '#7f1d1d' },
  { status: 'Rejected', label: 'Rejected', color: '#dc2626' },
  { status: 'ProcurementFailed', label: 'Procurement Failed', color: '#ea580c' },
];

export default function RequestsByStatusBar({
  requests,
  title = 'Requests by Status',
}: RequestsByStatusBarProps) {
  const data = useMemo(() => {
    const counts = new Map<RequestStatus, number>();
    for (const r of requests) {
      counts.set(r.status, (counts.get(r.status) || 0) + 1);
    }
    return PIPELINE.map((p) => ({
      label: p.label,
      value: counts.get(p.status) || 0,
      color: p.color,
    })).filter((d) => d.value > 0);
  }, [requests]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const maxValue = data.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Where requests are currently sitting in the pipeline.
          </p>
        </div>
        <ListChecks className="w-5 h-5 text-red-900" />
      </div>

      <div className="mt-4 h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No requests yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
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
                width={120}
              />
              <Tooltip content={<StatusTooltip total={total} />} cursor={{ fill: '#f9fafb' }} />
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

      {total > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Total: <span className="font-semibold text-gray-800">{total}</span> request{total === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

function StatusTooltip({
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
        {value} request{value === 1 ? '' : 's'} ({pct.toFixed(1)}%)
      </p>
    </div>
  );
}
