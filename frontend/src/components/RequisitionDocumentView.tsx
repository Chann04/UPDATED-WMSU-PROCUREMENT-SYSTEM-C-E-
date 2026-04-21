import type { RequestWithRelations } from '../types/database';
import type { ParsedRequisition, ParsedRequisitionItem, ParsedSignatory } from '../lib/parseRequisitionDescription';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  request: RequestWithRelations;
  parsed: ParsedRequisition;
  /** College admin adjust mode: inline editors for line items. */
  editableLineItems?: {
    items: ParsedRequisitionItem[];
    onChange: (items: ParsedRequisitionItem[]) => void;
  } | null;
  /** Department (faculty) view lock hint (legacy behavior compatibility). */
  lockCollegeSignatories?: boolean;
  /** College admin: edit Received by signatory during processing. */
  receivedByEdit?: {
    receivedBy: ParsedSignatory;
    onChange: (next: ParsedSignatory) => void;
  } | null;
  /** College admin view only: show selected budget type for the request. */
  showBudgetTypeUsed?: boolean;
};

function RawBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-gray-800">
      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Request details (text)</p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text || '—'}</pre>
    </div>
  );
}

export default function RequisitionDocumentView({
  request,
  parsed,
  editableLineItems,
  lockCollegeSignatories = false,
  receivedByEdit = null,
  showBudgetTypeUsed = false,
}: Props) {
  const req = request.requester;
  const collegeName = req?.department ?? null;
  const deptUnit = req?.faculty_department?.trim() || null;

  if (parsed.kind === 'raw') {
    return (
      <div className="space-y-4">
        <RawBlock text={parsed.text} />
      </div>
    );
  }

  const { header, items, signatories } = parsed;
  const displayItems = editableLineItems?.items ?? items;
  const lineTotal = (it: ParsedRequisitionItem) => it.qty * it.unitPrice;
  const grandTotal = displayItems.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = displayItems.reduce((s, it) => s + it.qty, 0);
  const headerValue = (...keys: string[]) => {
    for (const k of keys) {
      const v = header[k];
      if (v?.trim()) return v.trim();
    }
    return '—';
  };

  const patchLine = (index: number, patch: Partial<ParsedRequisitionItem>) => {
    if (!editableLineItems) return;
    const next = displayItems.map((it, i) => {
      if (i !== index) return { ...it, lineNo: i + 1 };
      return { ...it, ...patch, lineNo: i + 1 };
    });
    editableLineItems.onChange(next);
  };

  return (
    <div className="space-y-6">
      <section className="px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          <img src="/wmsu1.jpg" alt="WMSU seal" className="h-12 w-12 object-contain" />
          <div className="w-[360px] max-w-[52vw] text-center leading-tight">
            <p className="text-[11px] text-gray-700">Republic of the Philippines</p>
            <p className="text-sm font-bold text-gray-900 uppercase">Western Mindanao State University</p>
            <p className="text-[11px] text-gray-700">Normal Road, Baliwasan, Zamboanga City 7000</p>
          </div>
          <img src="/cert.jpg" alt="WMSU accreditation header" className="h-12 w-auto object-contain" />
        </div>
      </section>

      <section className="border-b border-gray-200 pb-3">
        <h2 className="text-xl font-bold text-gray-900 text-center">Requisition and Issue Slip</h2>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide mb-2">
          Requisition header
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="min-w-full text-sm border-collapse">
            <tbody className="bg-white">
              <tr className="bg-gray-50">
                <td className="px-3 py-1.5 text-[11px] uppercase font-semibold text-gray-700 border border-gray-300">Division</td>
                <td className="px-3 py-1.5 text-[11px] uppercase font-semibold text-gray-700 border border-gray-300">Office / Section</td>
                <td className="px-3 py-1.5 text-[11px] uppercase font-semibold text-gray-700 border border-gray-300">RIS No.</td>
                <td className="px-3 py-1.5 text-[11px] uppercase font-semibold text-gray-700 border border-gray-300">SAI No.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900">
                  {headerValue('Division')}
                </td>
                <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900">
                  {headerValue('Office / Section', 'Office/Section')}
                </td>
                <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900 font-mono">
                  {/* Auto-generated server-side; fall back to legacy description header for old rows. */}
                  {request.ris_no?.trim() || headerValue('RIS No', 'RIS No.', 'RIS NO')}
                </td>
                <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900 font-mono">
                  {request.sai_no?.trim() || headerValue('SAI No', 'SAI No.', 'SAI NO')}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-3 py-1.5 text-[11px] uppercase font-semibold text-gray-700 border border-gray-300">
                  Purpose
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 border border-gray-300 font-medium text-gray-900">
                  {headerValue('Purpose')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide mb-4">
          Line items{editableLineItems ? ' (editing)' : ''}
        </h3>
        {editableLineItems ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Edit quantities, prices, or descriptions below, then use <strong>Save as approved</strong> in the footer.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-red-950 text-white">
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase">#</th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Unit</th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase min-w-[180px]">Item / Description</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Req Qty</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Est unit price</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                    No line items could be read from this record. See raw details below if shown.
                  </td>
                </tr>
              ) : null}
              {displayItems.map((it, rowIdx) => (
                <tr key={`${it.lineNo}-${rowIdx}`} className="hover:bg-gray-50/80">
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">{rowIdx + 1}</td>
                  {editableLineItems ? (
                    <>
                      <td className="px-2 py-2">
                        <input
                          value={it.unit}
                          onChange={(e) => patchLine(rowIdx, { unit: e.target.value })}
                          className="w-full min-w-[3rem] px-2 py-1.5 rounded border border-gray-300 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={it.item}
                          onChange={(e) => patchLine(rowIdx, { item: e.target.value })}
                          className="w-full min-w-[8rem] px-2 py-1.5 rounded border border-gray-300 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={it.qty}
                          onChange={(e) => patchLine(rowIdx, { qty: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full min-w-[4rem] px-2 py-1.5 rounded border border-gray-300 text-sm text-right tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            patchLine(rowIdx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full min-w-[5rem] px-2 py-1.5 rounded border border-gray-300 text-sm text-right tabular-nums"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-gray-900">{it.unit || '—'}</td>
                      <td className="px-3 py-3 text-gray-900">{it.item}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(it.unitPrice)}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-gray-900">
                    {money(lineTotal(it))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td colSpan={3} className="px-3 py-3 text-right font-semibold text-gray-800">
                  Totals
                </td>
                <td className="px-3 py-3 text-right font-bold tabular-nums text-gray-900">{totalQty}</td>
                <td className="px-3 py-3 text-right text-gray-500 text-xs">—</td>
                <td className="px-3 py-3 text-right font-bold text-red-900 tabular-nums">{money(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Request record total (system): {money(request.total_price || 0)} · Qty (system): {request.quantity}
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide mb-4">
          Signatories
        </h3>
        {receivedByEdit ? (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Received by (edit)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={receivedByEdit.receivedBy.name}
                onChange={(e) => receivedByEdit.onChange({ ...receivedByEdit.receivedBy, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
              />
              <input
                value={receivedByEdit.receivedBy.designation}
                onChange={(e) =>
                  receivedByEdit.onChange({ ...receivedByEdit.receivedBy, designation: e.target.value })
                }
                placeholder="Designation"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
              />
              <input
                type="date"
                value={receivedByEdit.receivedBy.date}
                onChange={(e) => receivedByEdit.onChange({ ...receivedByEdit.receivedBy, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
              />
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700 w-[16%] border border-gray-300"> </th>
                <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700 border border-gray-300">Requested by</th>
                <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700 border border-gray-300">Approved by</th>
                <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700 border border-gray-300">Issued by</th>
                <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700 border border-gray-300">Received by</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 border border-gray-300">Signature</td>
                <td className="px-3 py-6 border border-gray-300"> </td>
                <td className="px-3 py-6 border border-gray-300"> </td>
                <td className="px-3 py-6 border border-gray-300"> </td>
                <td className="px-3 py-6 border border-gray-300"> </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 border border-gray-300">Name</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.requestedBy.name || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.approvedBy.name || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.issuedBy.name || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{(receivedByEdit?.receivedBy.name ?? signatories.receivedBy.name) || '—'}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 border border-gray-300">Designation</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.requestedBy.designation || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.approvedBy.designation || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.issuedBy.designation || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{(receivedByEdit?.receivedBy.designation ?? signatories.receivedBy.designation) || '—'}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 border border-gray-300">Date</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.requestedBy.date || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.approvedBy.date || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{signatories.issuedBy.date || '—'}</td>
                <td className="px-3 py-2 border border-gray-300">{(receivedByEdit?.receivedBy.date ?? signatories.receivedBy.date) || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
