import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import psgc from '@dropdowns/psgc';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getAnonClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    }
  });
};

import {
  Mail,
  Loader2,
  Building2,
  User,
  Phone,
  MapPin,
  X,
  Image as ImageIcon,
  FileText,
  Hash
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const BUSINESS_TYPES = [
  '',
  'Sole Proprietorship',
  'Corporation',
  'Partnership',
  'Cooperative',
  'Other'
];

const SupplierRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    contact_first_name: '',
    contact_middle_name: '',
    contact_last_name: '',
    contact_number: '',
    email: '',
    region_code: '',
    province_code: '',
    municipality_code: '',
    barangay_name: '',
    street: '',
    category: '',
    tin_number: '',
    business_registration_no: '',
    business_type: '',
    project_attending: ''
  });
  const [regions, setRegions] = useState<{ name: string; reg_code: string }[]>([]);
  const [provinces, setProvinces] = useState<{ name: string; prv_code: string }[]>([]);
  const [municipalities, setMunicipalities] = useState<{ name: string; mun_code: string }[]>([]);
  const [barangays, setBarangays] = useState<{ name: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const MAX_PORTFOLIO_FILES = 5;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setRegions(psgc.getAllRegions());
  }, []);

  useEffect(() => {
    if (!formData.region_code) {
      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      setFormData((f) => ({ ...f, province_code: '', municipality_code: '', barangay_name: '' }));
      return;
    }
    setProvinces(psgc.getProvincesByRegion(formData.region_code));
    setFormData((f) => ({ ...f, province_code: '', municipality_code: '', barangay_name: '' }));
  }, [formData.region_code]);

  useEffect(() => {
    if (!formData.province_code) {
      setMunicipalities([]);
      setBarangays([]);
      setFormData((f) => ({ ...f, municipality_code: '', barangay_name: '' }));
      return;
    }
    setMunicipalities(psgc.getMunicipalitiesByProvince(formData.province_code));
    setFormData((f) => ({ ...f, municipality_code: '', barangay_name: '' }));
  }, [formData.province_code]);

  useEffect(() => {
    if (!formData.municipality_code) {
      setBarangays([]);
      setFormData((f) => ({ ...f, barangay_name: '' }));
      return;
    }
    setBarangays(psgc.getBarangaysByMunicipality(formData.municipality_code));
    setFormData((f) => ({ ...f, barangay_name: '' }));
  }, [formData.municipality_code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'contact_number') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      const normalized = !digits ? '' : digits.startsWith('09') ? digits : digits.startsWith('9') ? ('09' + digits.slice(1)).slice(0, 11) : ('09' + digits).slice(0, 11);
      setFormData((f) => ({ ...f, [name]: normalized }));
    } else {
      setFormData((f) => ({ ...f, [name]: value }));
    }
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const PORTFOLIO_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx';
  const PORTFOLIO_MAX_MB = 10;

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxBytes = PORTFOLIO_MAX_MB * 1024 * 1024;
    const oversized = files.find((f) => f.size > maxBytes);
    if (oversized) {
      setError(`Each portfolio file must be less than ${PORTFOLIO_MAX_MB}MB`);
      return;
    }
    setPortfolioFiles((prev) => [...prev, ...files].slice(0, MAX_PORTFOLIO_FILES));
    setError('');
    e.target.value = '';
  };

  const removePortfolioFile = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadOnePortfolio = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `suppliers/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/supplier-portfolios/${fileName}`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: formDataUpload
      });
      if (!uploadResponse.ok) return null;
      return `${supabaseUrl}/storage/v1/object/public/supplier-portfolios/${fileName}`;
    } catch {
      return null;
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `suppliers/${fileName}`;
      const formDataUpload = new FormData();
      formDataUpload.append('file', imageFile);
      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/vendor-images/${filePath}`, {
        method: 'POST',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: formDataUpload
      });
      if (!uploadResponse.ok) return null;
      return `${supabaseUrl}/storage/v1/object/public/vendor-images/${filePath}`;
    } catch {
      return null;
    }
  };

  const buildAddress = () => {
    const parts = [
      formData.street,
      formData.barangay_name,
      municipalities.find((m) => m.mun_code === formData.municipality_code)?.name,
      provinces.find((p) => p.prv_code === formData.province_code)?.name,
      regions.find((r) => r.reg_code === formData.region_code)?.name
    ].filter(Boolean);
    return parts.join(', ') || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const contactFull = [formData.contact_first_name, formData.contact_middle_name, formData.contact_last_name].filter(Boolean).join(' ').trim();
    if (!imageFile) {
      setError('Please upload a company logo/image. It is required.');
      return;
    }
    if (!formData.name || !formData.contact_first_name || !formData.contact_last_name || !formData.email) {
      setError('Please fill in all required fields (Company name, First name, Last name, Email).');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address (must contain @).');
      return;
    }
    if (formData.contact_number) {
      if (!/^\d+$/.test(formData.contact_number)) {
        setError('Phone number must contain digits only.');
        return;
      }
      if (!formData.contact_number.startsWith('09') || formData.contact_number.length !== 11) {
        setError('Phone number must start with 09 and be 11 digits (e.g. 09171234567).');
        return;
      }
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        try {
          imageUrl = await uploadImage();
        } catch {
          /* continue without image */
        }
      }

      const portfolioUrls: string[] = [];
      for (const file of portfolioFiles) {
        try {
          const url = await uploadOnePortfolio(file);
          if (url) portfolioUrls.push(url);
        } catch {
          /* skip failed upload */
        }
      }

      const address = buildAddress();
      const anonClient = getAnonClient();
      const insertData = {
        name: formData.name,
        contact_person: contactFull || null,
        contact_first_name: formData.contact_first_name || null,
        contact_middle_name: formData.contact_middle_name || null,
        contact_last_name: formData.contact_last_name || null,
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        address,
        category: formData.category || null,
        image_url: imageUrl,
        tin_number: formData.tin_number || null,
        business_registration_no: formData.business_registration_no || null,
        business_type: formData.business_type || null,
        portfolio_urls: portfolioUrls.length > 0 ? portfolioUrls : null,
        // project_attending omitted until column exists; see docs/supabase-suppliers-migration.md
      };

      const { error: err } = await anonClient
        .from('suppliers')
        .insert(insertData)
        .select()
        .single();

      if (err) throw err;
      setSuccess(true);
      setFormData({
        name: '',
        contact_first_name: '',
        contact_middle_name: '',
        contact_last_name: '',
        contact_number: '',
        email: '',
        region_code: '',
        province_code: '',
        municipality_code: '',
        barangay_name: '',
        street: '',
        category: '',
        tin_number: '',
        business_registration_no: '',
        business_type: '',
        project_attending: ''
      });
      setImageFile(null);
      setImagePreview(null);
      setPortfolioFiles([]);
    } catch (err: any) {
      setError(err.message || 'Failed to submit profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const successMessage = 'Profile submitted. Your supplier profile has been sent to the procurement team. They will review it and respond to you at the email you provided.';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <CenteredAlert
        error={error || undefined}
        success={success ? successMessage : undefined}
        onClose={() => { setError(''); setSuccess(false); }}
      />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block">
            <img src="/wmsu1.jpg" alt="WMSU Logo" className="w-32 h-32 rounded-full object-cover drop-shadow-lg mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-bold text-black">Western Mindanao State University</h1>
          <p className="text-black mt-2 font-semibold">WMSU-Procurement</p>
          <p className="text-black mt-1 text-sm">A Smart Research University by 2040</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-black text-center mb-6">Submit Supplier Profile</h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Submit your company profile to participate in WMSU procurement. This is not a user account—you will receive our response at the email you provide.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Logo - required */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Company Logo/Image <span className="text-red-600">*</span>
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300" />
                  <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${error && error.includes('logo') ? 'border-red-400 bg-red-50/50' : 'border-gray-300'}`}>
                  <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload (PNG, JPG, GIF max 5MB) <span className="text-red-600">Required</span></p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} required />
                </label>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Company Name <span className="text-red-600">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Enter company name"
                    required
                  />
                </div>
              </div>

              {/* Contact: First, Middle Initial (optional), Last */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">First Name <span className="text-red-600">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="contact_first_name"
                    value={formData.contact_first_name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="First name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Middle Initial (optional)</label>
                <input
                  type="text"
                  name="contact_middle_name"
                  value={formData.contact_middle_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g. A."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Last Name <span className="text-red-600">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="contact_last_name"
                    value={formData.contact_last_name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Phone Number (max 11 digits)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Must start with 09 (e.g. 09171234567)"
                    maxLength={11}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Email Address <span className="text-red-600">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => {
                      if (formData.email && !formData.email.includes('@')) setError('Please enter a valid email (must contain @).');
                    }}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="e.g. name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                >
                  <option value="">Select category</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Construction">Construction</option>
                  <option value="Services">Services</option>
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Laboratory Equipment">Laboratory Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Business Type</label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                >
                  {BUSINESS_TYPES.map((opt) => (
                    <option key={opt || 'blank'} value={opt}>{opt || 'Select type'}</option>
                  ))}
                </select>
              </div>

              {/* Business credentials */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">TIN Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="tin_number"
                    value={formData.tin_number}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Tax Identification Number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">DTI / SEC Registration No.</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="business_registration_no"
                    value={formData.business_registration_no}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Business registration number"
                  />
                </div>
              </div>

              {/* Address: dropdowns (Philippines) */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Address (Philippines)</label>
                <div className="space-y-2">
                  <select
                    name="region_code"
                    value={formData.region_code}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                      <option key={r.reg_code} value={r.reg_code}>{r.name}</option>
                    ))}
                  </select>
                  <select
                    name="province_code"
                    value={formData.province_code}
                    onChange={handleChange}
                    disabled={!formData.region_code}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-gray-100"
                  >
                    <option value="">Select Province</option>
                    {provinces.map((p) => (
                      <option key={p.prv_code} value={p.prv_code}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    name="municipality_code"
                    value={formData.municipality_code}
                    onChange={handleChange}
                    disabled={!formData.province_code}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-gray-100"
                  >
                    <option value="">Select City / Municipality</option>
                    {municipalities.map((m) => (
                      <option key={m.mun_code} value={m.mun_code}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    name="barangay_name"
                    value={formData.barangay_name}
                    onChange={handleChange}
                    disabled={!formData.municipality_code}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-gray-100"
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      placeholder="Street / Building / Purok (optional)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Project Attending</label>
              <input
                type="text"
                name="project_attending"
                value={formData.project_attending}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                placeholder="e.g. Supply of Laboratory Equipment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Portfolio (optional, up to {MAX_PORTFOLIO_FILES} files)</label>
              <input
                type="file"
                multiple
                accept={PORTFOLIO_ACCEPT}
                onChange={handlePortfolioChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-red-50 file:text-red-900 file:cursor-pointer file:hover:bg-red-100 file:transition-colors"
              />
              {portfolioFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {portfolioFiles.map((file, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <button type="button" onClick={() => removePortfolioFile(i)} className="text-red-600 hover:text-red-700 p-0.5" aria-label="Remove">
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX max {PORTFOLIO_MAX_MB}MB each</p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Submit profile'}
            </button>
          </form>
        </div>

        <p className="text-center text-black text-sm mt-6">
          Western Mindanao State University © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default SupplierRegister;
