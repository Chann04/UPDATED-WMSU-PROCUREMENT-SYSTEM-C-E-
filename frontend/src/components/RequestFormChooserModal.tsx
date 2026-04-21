import { ClipboardList, PackageCheck, X } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';

type Props = {
  request: RequestWithRelations | null;
  onClose: () => void;
  onChooseRequisition: () => void;
  onChooseInventory: () => void;
};

export default function RequestFormChooserModal({
  request,
  onClose,
  onChooseRequisition,
  onChooseInventory,
}: Props) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close form chooser"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl rounded-xl bg-white border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Choose form to view</h2>
            <p className="text-sm text-gray-500 mt-0.5">{request.item_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <button
            type="button"
            onClick={onChooseRequisition}
            className="text-left rounded-xl border border-gray-200 p-5 hover:border-red-300 hover:bg-red-50/40 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-900 mb-3">
              <ClipboardList className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900">Requisition and Issue Slip</p>
            <p className="text-sm text-gray-600 mt-1">
              Open the requisition document modal for this request.
            </p>
          </button>

          <button
            type="button"
            onClick={onChooseInventory}
            className="text-left rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-900 mb-3">
              <PackageCheck className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900">Inventory Custodian Slip</p>
            <p className="text-sm text-gray-600 mt-1">
              Fill out the ICS form, then preview it in a requisition-style document view.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
