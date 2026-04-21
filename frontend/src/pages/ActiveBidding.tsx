import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, Hash, MapPin, Clock, Gavel } from 'lucide-react';
import { landingAPI } from '../lib/supabaseApi';
import type { TransparencyFeaturedItem } from '../types/database';
import type { LandingBiddingRow } from '../types/database';

/** One item for display: from featured item or bidding row */
type BiddingDisplayItem = {
  projectTitle: string;
  abc: number;
  referenceNo: string;
  closingDate: string;
  openingDate?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
};

function formatDate(dateString: string): string {
  if (!dateString?.trim()) return dateString || '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function getDaysUntilClosing(closingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closing = new Date(closingDate);
  closing.setHours(0, 0, 0, 0);
  const diff = closing.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function toDisplayItem(item: TransparencyFeaturedItem | LandingBiddingRow): BiddingDisplayItem {
  const abc = typeof item.abc === 'number' && !Number.isNaN(item.abc) ? item.abc : Math.floor(Number(item.abc)) || 0;
  return {
    projectTitle: item.projectTitle || '—',
    abc,
    referenceNo: item.referenceNo || '—',
    closingDate: item.closingDate || '',
    openingDate: 'openingDate' in item ? item.openingDate : undefined,
    location: 'location' in item ? item.location : undefined,
    description: 'description' in item ? item.description : undefined,
    requirements: 'requirements' in item ? item.requirements : undefined,
    contactPerson: 'contactPerson' in item ? item.contactPerson : undefined,
    contactEmail: 'contactEmail' in item ? item.contactEmail : undefined,
    contactPhone: 'contactPhone' in item ? item.contactPhone : undefined,
    status: 'status' in item ? item.status : 'Active'
  };
}

export default function ActiveBidding() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BiddingDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    landingAPI
      .getAll()
      .then((content) => {
        if (cancelled) return;
        const list: BiddingDisplayItem[] = [];
        const transparency = content.transparency;
        const entries = Array.isArray(transparency?.items) && transparency.items.length > 0
          ? transparency.items
          : transparency?.featuredItem
            ? [{ featuredItem: transparency.featuredItem }]
            : [];
        entries.forEach((e) => {
          const f = e?.featuredItem;
          if (!f?.projectTitle) return;
          const status = (f.status ?? 'Active').trim().toLowerCase();
          if (status !== 'active') return;
          list.push(toDisplayItem(f));
        });
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRow = selectedIndex !== null ? items[selectedIndex] : null;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-red-900 border-b border-red-800 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/landing" className="text-sm text-red-100 hover:text-white">Back to Landing</Link>
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-white hover:bg-red-800 rounded">Log in</Link>
        </div>
      </nav>

      <main className="flex-1 pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900 text-white">
                <Gavel className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Active Bidding Opportunities</h1>
            </div>
            <p className="text-gray-600 mt-2">Current procurement opportunities. Submit your bids before the closing date.</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              No active bidding items. Add entries under Manage Landing → Transparency Seal.
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Project Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">ABC (₱)</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Closing Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const daysUntil = getDaysUntilClosing(item.closingDate);
                        const isUrgent = daysUntil <= 7 && daysUntil >= 0;
                        const status = item.status || 'Active';
                        return (
                          <tr
                            key={index}
                            onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">{item.projectTitle}</div>
                              {isUrgent && status === 'Active' && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  {daysUntil === 0 ? 'Closes today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-800 font-medium">
                              ₱{Number(item.abc).toLocaleString()}
                            </td>
                            <td className="py-4 px-4 font-mono text-gray-600">{item.referenceNo}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{item.closingDate ? formatDate(item.closingDate) : '—'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedRow && (
                <div
                  key={selectedIndex}
                  className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 animate-detail-panel-in"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedRow.projectTitle}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          <span className="font-mono">{selectedRow.referenceNo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-gray-900">₱{Number(selectedRow.abc).toLocaleString()}</span>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            (selectedRow.status || 'Active') === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {selectedRow.status || 'Active'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedIndex(null)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Close details"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Important Dates
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Closing Date:</span>
                            <span className="font-medium text-gray-900">
                              {selectedRow.closingDate ? formatDate(selectedRow.closingDate) : '—'}
                            </span>
                          </div>
                          {selectedRow.openingDate && (
                            <div className="flex justify-between">
                              <span>Opening Date:</span>
                              <span className="font-medium text-gray-900">{formatDate(selectedRow.openingDate)}</span>
                            </div>
                          )}
                          {selectedRow.closingDate && (selectedRow.status || 'Active') === 'Active' && (
                            <div className="flex justify-between">
                              <span>Days Remaining:</span>
                              <span className="font-medium text-gray-900">{getDaysUntilClosing(selectedRow.closingDate)} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedRow.location && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Location
                          </h3>
                          <p className="text-sm text-gray-600">{selectedRow.location}</p>
                        </div>
                      )}
                    </div>
                    {(selectedRow.contactPerson || selectedRow.contactEmail || selectedRow.contactPhone) && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Contact Information
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          {selectedRow.contactPerson && (
                            <div>
                              <span className="font-medium text-gray-900">Contact Person:</span> {selectedRow.contactPerson}
                            </div>
                          )}
                          {selectedRow.contactEmail && (
                            <div>
                              <span className="font-medium text-gray-900">Email:</span>{' '}
                              <a href={`mailto:${selectedRow.contactEmail}`} className="text-gray-700 hover:underline">
                                {selectedRow.contactEmail}
                              </a>
                            </div>
                          )}
                          {selectedRow.contactPhone && (
                            <div>
                              <span className="font-medium text-gray-900">Phone:</span>{' '}
                              <a href={`tel:${selectedRow.contactPhone}`} className="text-gray-700 hover:underline">
                                {selectedRow.contactPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedRow.description && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Project Description
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedRow.description}</p>
                    </div>
                  )}
                  {Array.isArray(selectedRow.requirements) && selectedRow.requirements.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Requirements</h3>
                      <ul className="space-y-2">
                        {selectedRow.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="mt-auto py-8 px-4 bg-red-900 text-white text-center text-sm border-t border-red-800">
        Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
