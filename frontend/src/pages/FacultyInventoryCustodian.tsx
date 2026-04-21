import React, { useMemo, useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

const money = (n: number) =>
  `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ICSLine = {
  qty: string;
  unit: string;
  article: string;
  description: string;
  accountCode: string;
  inventoryItemNo: string;
  estimatedUsefulLife: string;
  amount: string;
};

const emptyLine = (): ICSLine => ({
  qty: '',
  unit: '',
  article: '',
  description: '',
  accountCode: '',
  inventoryItemNo: '',
  estimatedUsefulLife: '',
  amount: '',
});

const inputCell = 'w-full min-w-0 px-2 py-1.5 rounded border border-gray-300 text-sm';

export default function FacultyInventoryCustodian() {
  const [icsNo, setIcsNo] = useState('');
  const [lines, setLines] = useState<ICSLine[]>([emptyLine()]);

  const [receivedByName, setReceivedByName] = useState('');
  const [receivedByPosition, setReceivedByPosition] = useState(
    'Admin. Asst. for Program Monitoring & Evaluation/OP'
  );
  const [receivedByDate, setReceivedByDate] = useState('');

  const [receivedFromName, setReceivedFromName] = useState('');
  const [receivedFromOffice, setReceivedFromOffice] = useState('Property Management Office');
  const [receivedFromDate, setReceivedFromDate] = useState('');

  const computed = useMemo(() => {
    return lines.map((l) => {
      const q = Math.max(0, Number(l.qty) || 0);
      const a = Math.max(0, Number(l.amount) || 0);
      return { ...l, q, a, lineTotal: q * a };
    });
  }, [lines]);

  const grandTotal = useMemo(() => computed.reduce((s, r) => s + r.lineTotal, 0), [computed]);

  const updateLine = (idx: number, key: keyof ICSLine, value: string) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventory Custodian</h1>
        <p className="text-base text-gray-500 mt-1">
          Complete the Inventory Custodian Slip (ICS) line items and signatories below.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-5">
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Western Mindanao State University
            </p>
            <p className="text-sm font-semibold text-gray-900">Property Management Office</p>
            <p className="text-xs text-gray-500">Zamboanga City</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inventory Custodian Slip</h2>
            </div>
            <div>
              <label htmlFor="ics-no" className="block text-sm font-medium text-gray-800 mb-1">
                ICS No.
              </label>
              <input
                id="ics-no"
                value={icsNo}
                onChange={(e) => setIcsNo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                placeholder="e.g. ICS-2026-001"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Article</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase min-w-[180px]">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Account Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Inv. Item No.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Est. Useful Life
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                    Total Amt.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={line.qty}
                        onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                        className={`${inputCell} w-16`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={line.unit}
                        onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                        className={`${inputCell} w-20`}
                        placeholder="pc"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={line.article}
                        onChange={(e) => updateLine(idx, 'article', e.target.value)}
                        className={`${inputCell} w-36`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <textarea
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        rows={2}
                        className={`${inputCell} w-64 max-w-full resize-y min-h-[2.75rem]`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={line.accountCode}
                        onChange={(e) => updateLine(idx, 'accountCode', e.target.value)}
                        className={`${inputCell} w-28`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={line.inventoryItemNo}
                        onChange={(e) => updateLine(idx, 'inventoryItemNo', e.target.value)}
                        className={`${inputCell} w-28`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={line.estimatedUsefulLife}
                        onChange={(e) => updateLine(idx, 'estimatedUsefulLife', e.target.value)}
                        className={`${inputCell} w-28`}
                        placeholder="e.g. 5 yrs"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.amount}
                        onChange={(e) => updateLine(idx, 'amount', e.target.value)}
                        className={`${inputCell} w-28 text-right tabular-nums`}
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-right tabular-nums text-sm font-medium text-gray-900">
                      {money(computed[idx].lineTotal)}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="p-1.5 rounded text-red-700 hover:bg-red-50 disabled:opacity-40"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td
                    colSpan={8}
                    className="px-3 py-2.5 text-right text-sm font-semibold text-gray-900 uppercase tracking-wide"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-900 tabular-nums">
                    {money(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add line
            </button>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Signatories</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Received by</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Signature over printed name"
                  />
                  <input
                    value={receivedByPosition}
                    onChange={(e) => setReceivedByPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Position / Office"
                  />
                  <input
                    type="date"
                    value={receivedByDate}
                    onChange={(e) => setReceivedByDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Received from</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={receivedFromName}
                    onChange={(e) => setReceivedFromName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Signature over printed name"
                  />
                  <input
                    value={receivedFromOffice}
                    onChange={(e) => setReceivedFromOffice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Office"
                  />
                  <input
                    type="date"
                    value={receivedFromDate}
                    onChange={(e) => setReceivedFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
