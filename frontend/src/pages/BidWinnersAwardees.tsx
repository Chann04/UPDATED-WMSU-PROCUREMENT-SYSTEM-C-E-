import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { ArrowLeft, Award, CheckCircle, ListOrdered, FileCheck, Loader2, ChevronDown } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getAnonClient = () =>
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    }
  });

type AwardedRequest = {
  id: string;
  item_name: string;
  total_price: number;
  approved_at: string | null;
  status: string;
  supplier: { name: string } | null;
};

export default function BidWinnersAwardees() {
  const [awardees, setAwardees] = useState<AwardedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processExpanded, setProcessExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = getAnonClient();
    client
      .from('requests')
      .select('id, item_name, total_price, approved_at, status, supplier:suppliers!supplier_id(name)')
      .not('supplier_id', 'is', null)
      .order('approved_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setAwardees([]);
          return;
        }
        setAwardees((data as AwardedRequest[]) ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
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
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Bid Winners & Awardees</h1>
            <p className="text-gray-600">PMR — How the Bids and Awards Committee (BAC) selects the winning bid and who was awarded.</p>
          </div>

          {/* BAC process */}
          <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden mb-10">
            <button
              type="button"
              onClick={() => setProcessExpanded((v) => !v)}
              className="w-full text-left text-xl font-bold text-gray-900 px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between gap-2 hover:bg-red-100/50 transition-colors cursor-pointer"
              aria-expanded={processExpanded}
            >
              <span>How WMSU selects the winning bid</span>
              <ChevronDown className={`w-6 h-6 text-gray-600 shrink-0 transition-transform ${processExpanded ? 'rotate-180' : ''}`} />
            </button>
            {processExpanded && (
            <div className="divide-y divide-red-100">
              <div className="p-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-red-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">1. Pass/Fail filter (quality first)</h3>
                    <p className="text-gray-600 mt-1 text-sm">
                      Before anyone looks at the price, the university’s Bids and Awards Committee (BAC) opens the <strong>Technical Envelope</strong>. This is a non-discretionary Pass/Fail test.
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li><strong>Quality requirement:</strong> The university sets a minimum standard (e.g., “The laptop must have 16GB RAM and a 1TB SSD”).</li>
                      <li><strong>Elimination:</strong> If your product meets or exceeds the specs, you Pass. If it is below the minimum, you Fail and are disqualified immediately.</li>
                      <li><strong>Result:</strong> Only vendors who meet or exceed the minimum quality move to the next round. At this stage, having a “better” product does not give extra points—it just keeps you in the game.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <ListOrdered className="w-5 h-5 text-red-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">2. Price ranking (the “lowest” part)</h3>
                    <p className="text-gray-600 mt-1 text-sm">
                      Once there is a list of all vendors who passed the quality filter, the BAC opens the <strong>Financial Envelope</strong>.
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>They rank the remaining vendors from lowest price to highest price.</li>
                      <li>The vendor with the lowest price is declared the <strong>Lowest Calculated Bid (LCB)</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-red-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">3. Post-qualification (the “responsive” part)</h3>
                    <p className="text-gray-600 mt-1 text-sm">
                      The university then does a background check on the LCB vendor to ensure they are a legitimate, capable supplier. They verify:
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li><strong>Legal:</strong> Are your permits authentic?</li>
                      <li><strong>Technical:</strong> Can your product do what you claimed? (e.g., product demo.)</li>
                      <li><strong>Financial:</strong> Do you have the capacity to complete the project?</li>
                    </ul>
                    <p className="mt-2 text-sm text-gray-700">
                      <strong>The winner:</strong> If you pass this final check, you are the <strong>LCRB—Lowest Calculated Responsive Bid</strong>—and you win the contract.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </section>

          {/* Awardees list */}
          <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2">
              <Award className="w-6 h-6 text-red-800" />
              Awardees
            </h2>
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading awardees…</span>
                </div>
              ) : awardees.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No awarded contracts to display yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-2 font-semibold text-gray-900">Project / Item</th>
                        <th className="py-3 px-2 font-semibold text-gray-900">ABC (₱)</th>
                        <th className="py-3 px-2 font-semibold text-gray-900">Awarded to</th>
                        <th className="py-3 px-2 font-semibold text-gray-900">Date</th>
                        <th className="py-3 px-2 font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awardees.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-red-50/30">
                          <td className="py-3 px-2 text-gray-900">{row.item_name}</td>
                          <td className="py-3 px-2 font-medium text-gray-800">
                            ₱{Number(row.total_price).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-gray-700">{row.supplier?.name ?? '—'}</td>
                          <td className="py-3 px-2 text-gray-600 text-sm">
                            {row.approved_at
                              ? new Date(row.approved_at).toLocaleDateString('en-PH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                row.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : row.status === 'Rejected' || row.status === 'ProcurementFailed'
                                    ? 'bg-rose-100 text-rose-800'
                                  : row.status === 'Procuring' ||
                                      row.status === 'ProcurementDone' ||
                                      row.status === 'Received'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
