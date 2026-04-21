import { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

type Props = {
  error?: string;
  success?: string;
  onClose: () => void;
};

/**
 * Renders an error or success message in a fixed overlay centered on the screen.
 * Use for all user-facing alerts so they appear in the middle of the viewport.
 */
export function CenteredAlert({ error, success, onClose }: Props) {
  if (!error && !success) return null;

  const isError = !!error;

  useEffect(() => {
    // Auto-dismiss after a short time to reduce UI friction.
    const timer = setTimeout(onClose, isError ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [isError, error, success, onClose]);

  return (
    <div
      className="fixed top-4 right-4 z-[100] w-[min(92vw,420px)]"
      role="status"
      aria-live="polite"
      aria-label={isError ? 'Error' : 'Success'}
    >
      <div
        className={`rounded-xl shadow-lg w-full p-4 flex items-start gap-3 border backdrop-blur-sm ${
          isError
            ? 'bg-red-50/95 border-red-200 text-red-800'
            : 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        )}
        <p className="flex-1 text-sm leading-5 font-medium">
          {error || success}
        </p>
        <button
          type="button"
          onClick={onClose}
          className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            isError ? 'hover:bg-red-100' : 'hover:bg-emerald-100'
          }`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
