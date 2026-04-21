import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { suppliersAPI } from '../lib/supabaseApi';
import type { Supplier } from '../types/database';
import {
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const AccreditationPortal = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await suppliersAPI.getAll();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const qualified = suppliers.filter((s) => s.status === 'Qualified');
  const disqualified = suppliers.filter((s) => s.status === 'Disqualified');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
        <p className="mt-3 text-gray-500">Loading accreditation lists...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CenteredAlert error={error || undefined} success={undefined} onClose={() => setError('')} />
      {/* Public header */}
      <nav className="bg-red-900 border-b border-red-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/landing" className="flex items-center gap-2">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white">WMSU-Procurement</span>
        </Link>
        <Link to="/login" className="text-sm font-medium text-white hover:bg-red-800 px-3 py-2 rounded">Log in</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-red-900" />
            Accreditation Portal
          </h1>
          <p className="text-gray-500 mt-1">
            View qualified and disqualified suppliers. No login required.
          </p>
        </div>

      {/* Qualified suppliers */}
      <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-green-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Qualified suppliers
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {qualified.length} supplier{qualified.length !== 1 ? 's' : ''} accredited to participate in procurement.
          </p>
        </div>
        <div className="p-6">
          {qualified.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">No qualified suppliers yet.</p>
          ) : (
            <ul className="space-y-4">
              {qualified.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} status="Qualified" />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Disqualified suppliers */}
      <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Disqualified suppliers
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {disqualified.length} supplier{disqualified.length !== 1 ? 's' : ''} not accredited.
          </p>
        </div>
        <div className="p-6">
          {disqualified.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">No disqualified suppliers.</p>
          ) : (
            <ul className="space-y-4">
              {disqualified.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} status="Disqualified" />
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  );
};

function SupplierCard({ supplier, status }: { supplier: Supplier; status: 'Qualified' | 'Disqualified' }) {
  const isQualified = status === 'Qualified';
  return (
    <li className="flex flex-wrap items-start gap-4 p-4 rounded-lg border border-red-100 hover:bg-red-50/30 transition-colors">
      <div className="flex-shrink-0">
        {supplier.image_url ? (
          <img
            src={supplier.image_url}
            alt={supplier.name}
            className="w-14 h-14 rounded-lg object-cover border border-gray-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-gray-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isQualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isQualified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {status}
          </span>
        </div>
        {supplier.category && (
          <p className="text-sm text-gray-500 mt-0.5">{supplier.category}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          {supplier.contact_person && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4 shrink-0" />
              {supplier.contact_person}
            </span>
          )}
          {supplier.contact_number && (
            <a href={`tel:${supplier.contact_number}`} className="flex items-center gap-1 hover:text-red-700">
              <Phone className="w-4 h-4 shrink-0" />
              {supplier.contact_number}
            </a>
          )}
          {supplier.email && (
            <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-red-700 break-all">
              <Mail className="w-4 h-4 shrink-0" />
              {supplier.email}
            </a>
          )}
          {supplier.address && (
            <span className="flex items-center gap-1 text-gray-500">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">{supplier.address}</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export default AccreditationPortal;
