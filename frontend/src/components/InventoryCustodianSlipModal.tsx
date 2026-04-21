import { useMemo, useState } from 'react';
import { Eye, Pencil, PlusCircle, Printer, Trash2, X } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

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

type Props = {
  request: RequestWithRelations | null;
  onClose: () => void;
};

const money = (n: number) =>
  `P${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function InventoryCustodianSlipModal({ request, onClose }: Props) {
  const [previewMode, setPreviewMode] = useState(true);
  const defaultUnitPrice = Math.max(0, Number(request?.unit_price) || 0);
  const [icsNo, setIcsNo] = useState('');
  const [lines, setLines] = useState<ICSLine[]>([
    {
      ...emptyLine(),
      qty: String(request?.quantity ?? ''),
      article: request?.item_name ?? '',
      description: request?.description ?? '',
      amount: String(request?.unit_price ?? ''),
    },
  ]);
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
      const hasAmountInput = String(l.amount ?? '').trim() !== '';
      const a = hasAmountInput ? Math.max(0, Number(l.amount) || 0) : defaultUnitPrice;
      return { ...l, q, a, lineTotal: q * a };
    });
  }, [lines, defaultUnitPrice]);

  const grandTotal = useMemo(() => computed.reduce((s, r) => s + r.lineTotal, 0), [computed]);

  const updateLine = (idx: number, key: keyof ICSLine, value: string) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const onPrint = () => {
    if (typeof window !== 'undefined') {
      if (!previewMode) {
        setPreviewMode(true);
        window.setTimeout(() => window.print(), 0);
      } else {
        window.print();
      }
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-8 sm:pt-12">
      <button
        type="button"
        className="print-hide absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="print-document-root relative z-10 w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200">
        <div className="print-hide sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">Inventory Custodian Slip - {request.item_name}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              {previewMode ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Edit form' : 'Preview slip'}
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="print-document-content px-4 py-6 sm:px-8 sm:pb-6">
          {!previewMode ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Property Management Office</p>
                  <p className="text-lg font-semibold text-gray-900">Inventory Custodian Slip</p>
                </div>
                <div>
                  <label htmlFor="ics-no-modal" className="block text-sm font-medium text-gray-800 mb-1">
                    ICS No.
                  </label>
                  <input
                    id="ics-no-modal"
                    value={icsNo}
                    onChange={(e) => setIcsNo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300"
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
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase min-w-[180px]">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Account Code</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Inv. Item No.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Est. Useful Life</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total Amt.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-2 py-2"><input type="number" min={0} step="any" value={line.qty} onChange={(e) => updateLine(idx, 'qty', e.target.value)} className={`${inputCell} w-16`} /></td>
                        <td className="px-2 py-2"><input value={line.unit} onChange={(e) => updateLine(idx, 'unit', e.target.value)} className={`${inputCell} w-20`} /></td>
                        <td className="px-2 py-2"><input value={line.article} onChange={(e) => updateLine(idx, 'article', e.target.value)} className={`${inputCell} w-36`} /></td>
                        <td className="px-2 py-2"><textarea value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} rows={2} className={`${inputCell} w-64 max-w-full resize-y min-h-[2.75rem]`} /></td>
                        <td className="px-2 py-2"><input value={line.accountCode} onChange={(e) => updateLine(idx, 'accountCode', e.target.value)} className={`${inputCell} w-28`} /></td>
                        <td className="px-2 py-2"><input value={line.inventoryItemNo} onChange={(e) => updateLine(idx, 'inventoryItemNo', e.target.value)} className={`${inputCell} w-28`} /></td>
                        <td className="px-2 py-2"><input value={line.estimatedUsefulLife} onChange={(e) => updateLine(idx, 'estimatedUsefulLife', e.target.value)} className={`${inputCell} w-28`} /></td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.amount}
                            onChange={(e) => updateLine(idx, 'amount', e.target.value)}
                            className={`${inputCell} w-28 text-right tabular-nums`}
                            placeholder={defaultUnitPrice > 0 ? String(defaultUnitPrice) : '0.00'}
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-sm font-medium text-gray-900">{money(computed[idx].lineTotal)}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1} className="p-1.5 rounded text-red-700 hover:bg-red-50 disabled:opacity-40" aria-label="Remove line">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addLine} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                <PlusCircle className="w-4 h-4" />
                Add line
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">Received by</p>
                  <div className="mt-3 space-y-2">
                    <input value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="Signature over printed name" />
                    <input value={receivedByPosition} onChange={(e) => setReceivedByPosition(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="Position / Office" />
                    <input type="date" value={receivedByDate} onChange={(e) => setReceivedByDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">Received from</p>
                  <div className="mt-3 space-y-2">
                    <input value={receivedFromName} onChange={(e) => setReceivedFromName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="Signature over printed name" />
                    <input value={receivedFromOffice} onChange={(e) => setReceivedFromOffice(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="Office" />
                    <input type="date" value={receivedFromDate} onChange={(e) => setReceivedFromDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="ics-print-sheet rounded-xl border-2 border-red-900/15 bg-gradient-to-b from-white to-gray-50/90 p-5 shadow-sm">
                <div className="mb-4 px-4 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <img src="/wmsu1.jpg" alt="WMSU seal" className="h-12 w-12 object-contain" />
                    <div className="w-[360px] max-w-[52vw] text-center leading-tight">
                      <p className="text-[11px] text-gray-700">Republic of the Philippines</p>
                      <p className="text-sm font-bold text-gray-900 uppercase">Western Mindanao State University</p>
                      <p className="text-[11px] text-gray-700">Normal Road, Baliwasan, Zamboanga City 7000</p>
                    </div>
                    <img src="/cert.jpg" alt="WMSU accreditation header" className="h-12 w-auto object-contain" />
                  </div>
                </div>
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-900 text-center">Inventory Custodian Slip</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p className="text-gray-600" />
                    <p className="text-gray-600 text-right"><span className="text-gray-500">ICS No:</span> {icsNo || '-'}</p>
                    <p className="text-gray-600">Item: <span className="font-medium text-gray-900">{request.item_name}</span></p>
                    <p className="text-gray-600 text-right"><span className="text-gray-500">Status:</span> {request.status}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-red-950 text-white">
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Qty</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Unit</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Article</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Description</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Account Code</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Inv. Item No.</th>
                        <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Useful Life</th>
                        <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Amount</th>
                        <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {computed.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{row.qty || '-'}</td>
                          <td className="px-3 py-2">{row.unit || '-'}</td>
                          <td className="px-3 py-2">{row.article || '-'}</td>
                          <td className="px-3 py-2">{row.description || '-'}</td>
                          <td className="px-3 py-2">{row.accountCode || '-'}</td>
                          <td className="px-3 py-2">{row.inventoryItemNo || '-'}</td>
                          <td className="px-3 py-2">{row.estimatedUsefulLife || '-'}</td>
                          <td className="px-3 py-2 text-right">{money(row.a)}</td>
                          <td className="px-3 py-2 text-right font-medium">{money(row.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td colSpan={8} className="px-3 py-3 text-right font-semibold text-gray-800">Grand total</td>
                        <td className="px-3 py-3 text-right font-bold text-red-900">{money(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="ics-signatory-print grid grid-cols-2 gap-6 mt-5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-xs font-bold text-red-900 uppercase tracking-wide mb-3">Received by</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-900 min-h-[1.2rem]">{receivedByName || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Signature Over Printed Name</p>
                      </div>
                      <div>
                        <p className="text-gray-700 min-h-[1.2rem]">{receivedByPosition || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Position/Office</p>
                      </div>
                      <div>
                        <p className="text-gray-700 min-h-[1.2rem]">{receivedByDate || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Date</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <p className="text-xs font-bold text-red-900 uppercase tracking-wide mb-3">Received from</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-900 min-h-[1.2rem]">{receivedFromName || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Signature Over Printed Name</p>
                      </div>
                      <div>
                        <p className="text-gray-700 min-h-[1.2rem]">{receivedFromOffice || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Office</p>
                      </div>
                      <div>
                        <p className="text-gray-700 min-h-[1.2rem]">{receivedFromDate || ' '}</p>
                        <div className="border-b border-gray-400 mt-1" />
                        <p className="text-[11px] text-gray-600 mt-1">Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
