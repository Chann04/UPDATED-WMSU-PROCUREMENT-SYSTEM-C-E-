import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { landingAPI } from '../lib/supabaseApi';
import type { AppPlannedItem } from '../types/database';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AnnualProcurementPlan() {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [appItems, setAppItems] = useState<AppPlannedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    landingAPI
      .getAll()
      .then((content) => {
        if (cancelled) return;
        const items = content.planning?.appItems ?? [];
        setAppItems(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setAppItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const planned = selectedMonth !== null
    ? appItems.filter((item) => item.month === selectedMonth)
    : [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar - same style as Active Bidding / Accreditation (public, no login required) */}
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-red-900 border-b border-red-800 px-4 sm:px-6">
        <Link to="/accreditation-portal" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/landing" className="text-sm text-red-100 hover:text-white">Back to Landing</Link>
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-white hover:bg-red-800 rounded">Log in</Link>
        </div>
      </nav>

      <div className="pt-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <Link
              to="/landing"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Annual Procurement Plan (APP)</h1>
            <p className="text-gray-600 mt-2">Planned purchases from January to December. Select a month to view planned procurements.</p>
          </div>

          {/* School year */}
          <div className="mb-4 px-1">
            <h2 className="text-xl font-bold text-gray-900">
              School Year {new Date().getFullYear()}-{new Date().getFullYear() + 1}
            </h2>
          </div>

          {/* List of months */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <ul className="divide-y divide-red-100">
              {MONTHS.map((name, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(selectedMonth === index ? null : index)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-red-50/50 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-gray-900">{name}</span>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${selectedMonth === index ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {selectedMonth === index && (
                    <div className="bg-red-50/30 border-t border-red-200 px-4 py-4">
                      {loading ? (
                        <div className="flex items-center gap-2 text-gray-500 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      ) : planned.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No planned purchases for this month.</p>
                      ) : (
                        <ul className="space-y-3">
                          {planned.map((item, i) => (
                            <li
                              key={i}
                              className="p-3 rounded-lg bg-white border border-red-100"
                            >
                              <div className="min-w-0">
                                <h3 className="font-medium text-gray-900">{item.projectTitle}</h3>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="text-sm font-semibold text-gray-900">
                                    ₱{Number(item.budget).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
