import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { suppliersAPI } from '../lib/supabaseApi';
import type { Supplier } from '../types/database';
import {
  Loader2,
  Search,
  Truck,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Hash,
  FileText
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

type StatusFilter = 'All' | 'Pending' | 'Qualified' | 'Disqualified';

const statusBadge = (status: Supplier['status']) => {
  if (status === 'Qualified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" /> Qualified
      </span>
    );
  }
  if (status === 'Disqualified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" /> Disqualified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
};

export default function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError('');
    try {
      const data = await suppliersAPI.getAll();
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (!q) return true;
      const blob = [
        s.name,
        s.email,
        s.contact_person,
        s.contact_number,
        s.category,
        s.address,
        s.tin_number,
        s.business_registration_no
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, statusFilter]);

  const updateStatus = async (id: string, status: Supplier['status']) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await suppliersAPI.update(id, { status });
      setSuccess('Supplier updated.');
      await load();
      setDetail((d) => (d?.id === id ? updated : d));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this supplier record? This cannot be undone.')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await suppliersAPI.delete(id);
      setSuccess('Supplier deleted.');
      setDetail((d) => (d?.id === id ? null : d));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-16">
      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-8 h-8 text-red-900" />
          Suppliers
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Registered suppliers from{' '}
          <Link to="/supplier-register" className="text-red-900 font-medium hover:underline">
            supplier registration
          </Link>
          . Update accreditation status and contact details.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search name, email, phone, TIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-red-200 text-sm focus:ring-2 focus:ring-red-900/20 focus:border-red-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['All', 'Pending', 'Qualified', 'Disqualified'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-red-900 text-white' : 'bg-red-50 text-red-900 hover:bg-red-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50/80 border-b border-red-100 text-left text-gray-700">
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Registered</th>
                <th className="px-4 py-3 font-semibold w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No suppliers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.image_url ? (
                          <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{s.name}</p>
                          {s.category ? <p className="text-xs text-gray-500 truncate">{s.category}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {s.email ? (
                        <span className="block truncate max-w-[180px]" title={s.email}>
                          {s.email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 whitespace-nowrap">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetail(s)}
                          className="p-2 rounded-lg text-red-900 hover:bg-red-100"
                          title="View / edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          disabled={saving}
                          className="p-2 rounded-lg text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-red-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-red-100 bg-red-50/50">
              <h2 className="font-semibold text-gray-900">Supplier details</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg hover:bg-red-100 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {detail.image_url ? (
                <img src={detail.image_url} alt="" className="w-24 h-24 rounded-lg object-cover border border-gray-200 mx-auto sm:mx-0" />
              ) : null}
              <div>
                <p className="text-xs font-medium text-gray-500">Business name</p>
                <p className="font-semibold text-gray-900">{detail.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Accreditation status</p>
                <select
                  value={detail.status}
                  disabled={saving}
                  onChange={(e) => {
                    const status = e.target.value as Supplier['status'];
                    setDetail({ ...detail, status });
                  }}
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Disqualified">Disqualified</option>
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateStatus(detail.id, detail.status)}
                  className="mt-2 w-full sm:w-auto px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-950 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} Save status
                </button>
              </div>
              <DetailRow icon={User} label="Contact person" value={detail.contact_person} />
              <DetailRow icon={Mail} label="Email" value={detail.email} mailto />
              <DetailRow icon={Phone} label="Phone" value={detail.contact_number} tel />
              <DetailRow icon={MapPin} label="Address" value={detail.address} />
              <DetailRow icon={Building2} label="Category" value={detail.category} />
              <DetailRow icon={Hash} label="TIN" value={detail.tin_number} />
              <DetailRow icon={FileText} label="Business registration" value={detail.business_registration_no} />
              <DetailRow icon={Building2} label="Business type" value={detail.business_type} />
              {(detail.contact_first_name || detail.contact_last_name) && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Name: </span>
                  {[detail.contact_first_name, detail.contact_middle_name, detail.contact_last_name].filter(Boolean).join(' ')}
                </p>
              )}
              {detail.project_attending ? (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Project: </span>
                  {detail.project_attending}
                </p>
              ) : null}
              {detail.portfolio_url ? (
                <a
                  href={detail.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-900 font-medium hover:underline"
                >
                  Portfolio link
                </a>
              ) : null}
              {detail.portfolio_urls && detail.portfolio_urls.length > 0 ? (
                <ul className="text-sm space-y-1">
                  <li className="font-medium text-gray-700">Portfolio files</li>
                  {detail.portfolio_urls.map((u, i) => (
                    <li key={i}>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="text-red-900 hover:underline break-all">
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="pt-4 border-t border-red-100 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => remove(detail.id)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-800 text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  Delete supplier
                </button>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mailto,
  tel
}: {
  icon: typeof User;
  label: string;
  value: string | null | undefined;
  mailto?: boolean;
  tel?: boolean;
}) {
  if (!value?.trim()) return null;
  const inner =
    mailto ? (
      <a href={`mailto:${value}`} className="text-red-900 hover:underline break-all">
        {value}
      </a>
    ) : tel ? (
      <a href={`tel:${value}`} className="text-red-900 hover:underline">
        {value}
      </a>
    ) : (
      <span className="text-gray-800 whitespace-pre-wrap">{value}</span>
    );
  return (
    <div className="flex gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {inner}
      </div>
    </div>
  );
}
