import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Download, Hash, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { bidBulletinsAPI } from '../lib/supabaseApi';
import type { BidBulletin } from '../types/database';

function formatDate(dateString: string): string {
  if (!dateString?.trim()) return dateString || '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function getTypeColor(type: string): string {
  if (type === 'Supplemental') return 'bg-orange-100 text-orange-800';
  if (type === 'Notice') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800'; // Bulletins
}

type BulletinItem = BidBulletin & { id: string };

export default function BidBulletins() {
  const navigate = useNavigate();
  const [bulletins, setBulletins] = useState<BulletinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('All');

  useEffect(() => {
    bidBulletinsAPI.getAll().then(setBulletins).catch(() => setBulletins([])).finally(() => setLoading(false));
  }, []);

  const selectedItem = bulletins.find(item => item.id === selectedBulletin) ?? null;

  const filteredBulletins = filterType === 'All'
    ? bulletins
    : bulletins.filter(item => item.type === filterType);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-gray-100 border-b border-gray-200 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
          <span className="font-bold text-gray-900 text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/landing" className="text-sm text-gray-700 hover:text-gray-900">Back to Landing</Link>
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200/80 rounded">Log in</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
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
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Supplemental / Bid Bulletins</h1>
            </div>
            <p className="text-gray-600 mt-2">Access bid bulletins, supplements, and updates for ongoing procurements.</p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {['All', 'Bulletins', 'Supplemental', 'Notice'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-red-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Bulletins List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Loading…</div>
          ) : (
          <div className="space-y-4">
            {filteredBulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                onClick={() => setSelectedBulletin(bulletin.id === selectedBulletin ? null : bulletin.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(bulletin.type)}`}>
                        {bulletin.type}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {bulletin.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{bulletin.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-mono">{bulletin.referenceNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(bulletin.date)}</span>
                      </div>
                      {bulletin.relatedTo && (
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          <span>Related to: {bulletin.relatedTo}</span>
                        </div>
                      )}
                    </div>
                    {bulletin.description && <p className="text-sm text-gray-600 line-clamp-2">{bulletin.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-red-900">
                    <span className="text-sm font-medium">View Details</span>
                    <span className="transform transition-transform" style={{ transform: selectedBulletin === bulletin.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedBulletin === bulletin.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Changes & Updates
                        </h4>
                        <ul className="space-y-2">
                          {(Array.isArray(bulletin.changes) ? bulletin.changes : []).map((change, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-red-900 mt-1">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {bulletin.attachments && bulletin.attachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Attachments
                          </h4>
                          <div className="space-y-2">
                            {bulletin.attachments.map((attachment, index) => (
                              <a
                                key={index}
                                href={attachment.url}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-sm text-red-900 hover:text-red-700 hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                <span>{attachment.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}

          {!loading && filteredBulletins.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bulletins found for the selected filter.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer – at bottom of viewport */}
      <footer className="mt-auto py-8 px-4 bg-red-900 text-white text-center text-sm border-t border-red-800">
        Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

