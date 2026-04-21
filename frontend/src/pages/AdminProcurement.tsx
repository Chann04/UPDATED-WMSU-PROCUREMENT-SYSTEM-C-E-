import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Pencil,
  X,
  LayoutGrid,
  FileText,
  CalendarRange,
  Store,
  Phone,
  Megaphone
} from 'lucide-react';
import {
  landingAPI,
  transparencySealAPI,
  bidBulletinsAPI
} from '../lib/supabaseApi';
import { getRecommendedVendorCornerContent } from '../lib/vendorCornerDefaults';
import { getRecommendedBacDirectoryContent, isBacDirectoryEmpty } from '../lib/bacDirectoryDefaults';
import type {
  LandingContent,
  LandingDocumentItem,
  AppPlannedItem,
  TransparencySealEntry,
  BidBulletin,
  TransparencySealEntryRow
} from '../types/database';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const emptyDoc = (): LandingDocumentItem => ({
  title: '',
  description: '',
  url: '',
  category: ''
});

const emptyAppItem = (): AppPlannedItem => ({
  projectTitle: '',
  description: '',
  budget: 0,
  month: 0
});

const emptySealEntry = (): TransparencySealEntry => ({
  mission: '',
  featuredItem: {
    projectTitle: '',
    referenceNo: '',
    abc: 0,
    closingDate: '',
    openingDate: '',
    location: '',
    description: '',
    requirements: [],
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    status: 'Active'
  }
});

const emptyBulletin = (): BidBulletin => ({
  type: 'Bulletins',
  status: 'Active',
  title: '',
  referenceNo: '',
  date: '',
  relatedTo: '',
  description: '',
  changes: [],
  attachments: []
});

type Tab = 'transparency' | 'documents' | 'planning' | 'vendor' | 'bac' | 'bulletins';

export default function AdminProcurement() {
  const [tab, setTab] = useState<Tab>('transparency');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [landing, setLanding] = useState<LandingContent>({});
  const [sealRows, setSealRows] = useState<(TransparencySealEntryRow & { _entry?: TransparencySealEntry })[]>([]);
  const [bulletins, setBulletins] = useState<(BidBulletin & { id: string })[]>([]);

  const [editingSealId, setEditingSealId] = useState<string | null>(null);
  const [sealForm, setSealForm] = useState<TransparencySealEntry>(emptySealEntry);

  const [editingBulletinId, setEditingBulletinId] = useState<string | null>(null);
  const [bulletinForm, setBulletinForm] = useState<BidBulletin>(emptyBulletin());
  const [reqText, setReqText] = useState('');
  const [changesText, setChangesText] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, rows, bl] = await Promise.all([
        landingAPI.getAll(),
        transparencySealAPI.getAllRows(),
        bidBulletinsAPI.getAll()
      ]);
      setLanding(all);
      setSealRows(rows);
      setBulletins(bl);
    } catch (e: unknown) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const saveSection = async (section: keyof LandingContent, data: unknown) => {
    setSaving(true);
    try {
      await landingAPI.updateSection(section, data);
      const all = await landingAPI.getAll();
      setLanding(all);
      showMsg('ok', 'Saved.');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEditSeal = (row: TransparencySealEntryRow & { _entry?: TransparencySealEntry }) => {
    const entry: TransparencySealEntry = {
      mission: row.mission ?? '',
      featuredItem: {
        projectTitle: row.project_title,
        referenceNo: row.reference_no,
        abc: Number(row.abc),
        closingDate: row.closing_date ?? '',
        openingDate: row.opening_date ?? '',
        location: row.location ?? '',
        description: row.description ?? '',
        requirements: row.requirements ?? [],
        contactPerson: row.contact_person ?? '',
        contactEmail: row.contact_email ?? '',
        contactPhone: row.contact_phone ?? '',
        status: row.status
      }
    };
    setEditingSealId(row.id);
    setSealForm(entry);
    setReqText((row.requirements ?? []).join('\n'));
  };

  const saveSeal = async () => {
    const requirements = reqText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: TransparencySealEntry = {
      ...sealForm,
      featuredItem: {
        ...sealForm.featuredItem!,
        requirements
      }
    };
    setSaving(true);
    try {
      if (editingSealId) {
        await transparencySealAPI.update(editingSealId, payload);
      } else {
        await transparencySealAPI.create(payload);
      }
      setEditingSealId(null);
      setSealForm(emptySealEntry());
      setReqText('');
      await reload();
      showMsg('ok', 'Transparency entry saved.');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteSeal = async (id: string) => {
    if (!confirm('Delete this transparency seal entry?')) return;
    setSaving(true);
    try {
      await transparencySealAPI.delete(id);
      if (editingSealId === id) {
        setEditingSealId(null);
        setSealForm(emptySealEntry());
        setReqText('');
      }
      await reload();
      showMsg('ok', 'Deleted.');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const saveBulletin = async () => {
    const changes = changesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: BidBulletin = { ...bulletinForm, changes };
    setSaving(true);
    try {
      if (editingBulletinId) {
        await bidBulletinsAPI.update(editingBulletinId, payload);
      } else {
        await bidBulletinsAPI.create(payload);
      }
      setEditingBulletinId(null);
      setBulletinForm(emptyBulletin());
      setChangesText('');
      await reload();
      showMsg('ok', 'Bulletin saved.');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteBulletin = async (id: string) => {
    if (!confirm('Delete this bulletin?')) return;
    setSaving(true);
    try {
      await bidBulletinsAPI.delete(id);
      if (editingBulletinId === id) {
        setEditingBulletinId(null);
        setBulletinForm(emptyBulletin());
        setChangesText('');
      }
      await reload();
      showMsg('ok', 'Deleted.');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const startEditBulletin = (b: BidBulletin & { id: string }) => {
    setEditingBulletinId(b.id);
    setBulletinForm({ ...b });
    setChangesText((b.changes ?? []).join('\n'));
  };

  const docs = landing.documents?.items ?? [];
  const planning = landing.planning ?? { appItems: [], pmr: {} };
  const vendor = landing.vendor ?? {
    accreditationTitle: '',
    accreditationDescription: '',
    accreditationUrl: '',
    loginTitle: '',
    loginDescription: '',
    loginUrl: '',
    links: []
  };
  const bac = landing.bac ?? {
    secretariatName: '',
    secretariatEmail: '',
    secretariatPhone: '',
    officeAddress: '',
    officeNote: ''
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'transparency', label: 'Transparency seal', icon: LayoutGrid },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'planning', label: 'APP & PMR', icon: CalendarRange },
    { id: 'vendor', label: 'Vendor corner', icon: Store },
    { id: 'bac', label: 'BAC directory', icon: Phone },
    { id: 'bulletins', label: 'Bid bulletins', icon: Megaphone }
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
      <div className="mb-8">
        <Link to="/" className="text-sm text-red-900 hover:underline">
          ← Public landing
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 flex items-center gap-2">
          <Megaphone className="w-8 h-8 text-red-900" />
          Procurement portal (admin)
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Edit Transparency Seal content, documents, APP, vendor links, BAC contacts, and bid bulletins.
        </p>
      </div>

      {msg ? (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-8 border-b border-red-100 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-red-900 text-white' : 'bg-red-50 text-red-900 hover:bg-red-100'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Transparency */}
      {tab === 'transparency' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Active bidding pulls entries with status <strong>Active</strong>. Mission on the first row is shown on the landing merge.
          </p>
          <ul className="space-y-2">
            {sealRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl border border-red-100 bg-white"
              >
                <div>
                  <p className="font-medium text-gray-900">{row.project_title || '(no title)'}</p>
                  <p className="text-xs text-gray-500">{row.reference_no} · {row.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditSeal(row)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-sm hover:bg-red-50"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSeal(row.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {editingSealId ? 'Edit entry' : 'Add entry'}
              </h2>
              {editingSealId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSealId(null);
                    setSealForm(emptySealEntry());
                    setReqText('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancel edit
                </button>
              ) : null}
            </div>
            <label className="block text-xs font-medium text-gray-700">Mission (optional, often first row)</label>
            <textarea
              value={sealForm.mission ?? ''}
              onChange={(e) => setSealForm({ ...sealForm, mission: e.target.value })}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              rows={2}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Project title *"
                value={sealForm.featuredItem?.projectTitle ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, projectTitle: v }
                  })
                }
              />
              <Field
                label="Reference no."
                value={sealForm.featuredItem?.referenceNo ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, referenceNo: v }
                  })
                }
              />
              <Field
                label="ABC (₱)"
                value={String(sealForm.featuredItem?.abc ?? 0)}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, abc: Number(v) || 0 }
                  })
                }
              />
              <Field
                label="Status"
                value={sealForm.featuredItem?.status ?? 'Active'}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, status: v }
                  })
                }
              />
              <Field
                label="Closing date (YYYY-MM-DD)"
                value={sealForm.featuredItem?.closingDate ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, closingDate: v }
                  })
                }
              />
              <Field
                label="Opening date (YYYY-MM-DD)"
                value={sealForm.featuredItem?.openingDate ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, openingDate: v }
                  })
                }
              />
            </div>
            <Field
              label="Location"
              value={sealForm.featuredItem?.location ?? ''}
              onChange={(v) =>
                setSealForm({
                  ...sealForm,
                  featuredItem: { ...sealForm.featuredItem!, location: v }
                })
              }
            />
            <label className="block text-xs font-medium text-gray-700">Description</label>
            <textarea
              value={sealForm.featuredItem?.description ?? ''}
              onChange={(e) =>
                setSealForm({
                  ...sealForm,
                  featuredItem: { ...sealForm.featuredItem!, description: e.target.value }
                })
              }
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              rows={3}
            />
            <label className="block text-xs font-medium text-gray-700">Requirements (one per line)</label>
            <textarea
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-mono"
              rows={4}
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <Field
                label="Contact person"
                value={sealForm.featuredItem?.contactPerson ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, contactPerson: v }
                  })
                }
              />
              <Field
                label="Contact email"
                value={sealForm.featuredItem?.contactEmail ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, contactEmail: v }
                  })
                }
              />
              <Field
                label="Contact phone"
                value={sealForm.featuredItem?.contactPhone ?? ''}
                onChange={(v) =>
                  setSealForm({
                    ...sealForm,
                    featuredItem: { ...sealForm.featuredItem!, contactPhone: v }
                  })
                }
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveSeal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-950 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingSealId ? 'Update entry' : 'Add entry'}
            </button>
          </div>
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Listed on the landing page under Procurement Documents.</p>
          {docs.map((d, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-2 p-3 rounded-lg border border-red-100 bg-white">
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="Title"
                value={d.title}
                onChange={(e) => {
                  const next = [...docs];
                  next[i] = { ...next[i], title: e.target.value };
                  setLanding({ ...landing, documents: { items: next } });
                }}
              />
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="Category"
                value={d.category}
                onChange={(e) => {
                  const next = [...docs];
                  next[i] = { ...next[i], category: e.target.value };
                  setLanding({ ...landing, documents: { items: next } });
                }}
              />
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm sm:col-span-2"
                placeholder="URL"
                value={d.url}
                onChange={(e) => {
                  const next = [...docs];
                  next[i] = { ...next[i], url: e.target.value };
                  setLanding({ ...landing, documents: { items: next } });
                }}
              />
              <textarea
                className="rounded border border-red-200 px-2 py-1.5 text-sm sm:col-span-2"
                placeholder="Description"
                rows={2}
                value={d.description}
                onChange={(e) => {
                  const next = [...docs];
                  next[i] = { ...next[i], description: e.target.value };
                  setLanding({ ...landing, documents: { items: next } });
                }}
              />
              <button
                type="button"
                className="text-sm text-red-700 sm:col-span-2"
                onClick={() => {
                  const next = docs.filter((_, j) => j !== i);
                  setLanding({ ...landing, documents: { items: next } });
                }}
              >
                Remove row
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-red-900"
            onClick={() =>
              setLanding({
                ...landing,
                documents: { items: [...docs, emptyDoc()] }
              })
            }
          >
            <Plus className="w-4 h-4" /> Add document
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveSection('documents', { items: docs })}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save documents
          </button>
        </div>
      )}

      {/* Planning */}
      {tab === 'planning' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">PMR (Bid winners card)</h2>
            <p className="text-xs text-gray-500 mb-2">Shown as subtitle on the Bid Winners &amp; Awardees card.</p>
            <Field
              label="Description"
              value={planning.pmr?.description ?? ''}
              onChange={(v) =>
                setLanding({
                  ...landing,
                  planning: {
                    ...planning,
                    appItems: planning.appItems ?? [],
                    pmr: { ...planning.pmr, description: v }
                  }
                })
              }
            />
            <Field
              label="External link (optional)"
              value={planning.pmr?.url ?? ''}
              onChange={(v) =>
                setLanding({
                  ...landing,
                  planning: {
                    ...planning,
                    appItems: planning.appItems ?? [],
                    pmr: { ...planning.pmr, url: v }
                  }
                })
              }
            />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">APP line items (by month)</h2>
            {(planning.appItems ?? []).map((item, i) => (
              <div key={i} className="mb-4 p-3 rounded-lg border border-red-100 space-y-2">
                <select
                  className="rounded border border-red-200 px-2 py-1.5 text-sm"
                  value={item.month}
                  onChange={(e) => {
                    const next = [...(planning.appItems ?? [])];
                    next[i] = { ...next[i], month: Number(e.target.value) };
                    setLanding({ ...landing, planning: { ...planning, appItems: next } });
                  }}
                >
                  {MONTHS.map((m, mi) => (
                    <option key={m} value={mi}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded border border-red-200 px-2 py-1.5 text-sm"
                  placeholder="Project title"
                  value={item.projectTitle}
                  onChange={(e) => {
                    const next = [...(planning.appItems ?? [])];
                    next[i] = { ...next[i], projectTitle: e.target.value };
                    setLanding({ ...landing, planning: { ...planning, appItems: next } });
                  }}
                />
                <textarea
                  className="w-full rounded border border-red-200 px-2 py-1.5 text-sm"
                  placeholder="Description"
                  rows={2}
                  value={item.description}
                  onChange={(e) => {
                    const next = [...(planning.appItems ?? [])];
                    next[i] = { ...next[i], description: e.target.value };
                    setLanding({ ...landing, planning: { ...planning, appItems: next } });
                  }}
                />
                <input
                  type="number"
                  className="w-full rounded border border-red-200 px-2 py-1.5 text-sm"
                  placeholder="Budget (₱)"
                  value={item.budget}
                  onChange={(e) => {
                    const next = [...(planning.appItems ?? [])];
                    next[i] = { ...next[i], budget: Number(e.target.value) || 0 };
                    setLanding({ ...landing, planning: { ...planning, appItems: next } });
                  }}
                />
                <button
                  type="button"
                  className="text-sm text-red-700"
                  onClick={() => {
                    const next = (planning.appItems ?? []).filter((_, j) => j !== i);
                    setLanding({ ...landing, planning: { ...planning, appItems: next } });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-red-900"
              onClick={() =>
                setLanding({
                  ...landing,
                  planning: {
                    ...planning,
                    appItems: [...(planning.appItems ?? []), emptyAppItem()]
                  }
                })
              }
            >
              <Plus className="w-4 h-4" /> Add APP item
            </button>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              saveSection('planning', {
                appItems: planning.appItems ?? [],
                pmr: planning.pmr ?? {}
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save planning
          </button>
        </div>
      )}

      {/* Vendor */}
      {tab === 'vendor' && (
        <div className="space-y-4 max-w-xl">
          <p className="text-sm text-gray-600">
            Configure accreditation and login cards, plus optional extra links (shown in a grid above). If everything
            is left empty on the public site, visitors still see two default shortcuts (accreditation portal and supplier
            registration).
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-900 hover:bg-red-50"
            onClick={() =>
              setLanding({
                ...landing,
                vendor: getRecommendedVendorCornerContent()
              })
            }
          >
            Apply recommended vendor layout
          </button>
          <p className="text-xs text-gray-500">
            Fills titles, descriptions, and URLs to match the default landing grid—then click Save vendor section.
          </p>
          {(
            [
              ['accreditationTitle', 'Accreditation title'],
              ['accreditationDescription', 'Accreditation description'],
              ['accreditationUrl', 'Accreditation URL'],
              ['loginTitle', 'Supplier / login title'],
              ['loginDescription', 'Supplier / login description'],
              ['loginUrl', 'Supplier / login URL']
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              {key === 'accreditationDescription' || key === 'loginDescription' ? (
                <textarea
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                  rows={2}
                  value={(vendor as Record<string, string>)[key] ?? ''}
                  onChange={(e) =>
                    setLanding({
                      ...landing,
                      vendor: { ...vendor, [key]: e.target.value }
                    })
                  }
                />
              ) : (
                <input
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                  value={(vendor as Record<string, string>)[key] ?? ''}
                  onChange={(e) =>
                    setLanding({
                      ...landing,
                      vendor: { ...vendor, [key]: e.target.value }
                    })
                  }
                />
              )}
            </div>
          ))}
          <h3 className="font-medium text-gray-900 pt-2">Extra links</h3>
          {(vendor.links ?? []).map((link, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-red-100">
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="Label"
                value={link.label}
                onChange={(e) => {
                  const next = [...(vendor.links ?? [])];
                  next[i] = { ...next[i], label: e.target.value };
                  setLanding({ ...landing, vendor: { ...vendor, links: next } });
                }}
              />
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="URL"
                value={link.url}
                onChange={(e) => {
                  const next = [...(vendor.links ?? [])];
                  next[i] = { ...next[i], url: e.target.value };
                  setLanding({ ...landing, vendor: { ...vendor, links: next } });
                }}
              />
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="Description (optional)"
                value={link.description ?? ''}
                onChange={(e) => {
                  const next = [...(vendor.links ?? [])];
                  next[i] = { ...next[i], description: e.target.value };
                  setLanding({ ...landing, vendor: { ...vendor, links: next } });
                }}
              />
              <button
                type="button"
                className="text-sm text-red-700"
                onClick={() => {
                  const next = (vendor.links ?? []).filter((_, j) => j !== i);
                  setLanding({ ...landing, vendor: { ...vendor, links: next } });
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-red-900"
            onClick={() =>
              setLanding({
                ...landing,
                vendor: {
                  ...vendor,
                  links: [...(vendor.links ?? []), { label: '', url: '', description: '' }]
                }
              })
            }
          >
            <Plus className="w-4 h-4" /> Add link
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveSection('vendor', vendor)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save vendor section
          </button>
        </div>
      )}

      {/* BAC */}
      {tab === 'bac' && (
        <div className="space-y-4 max-w-xl">
          <p className="text-sm text-gray-600">
            Published data appears on the landing page BAC Directory. If name, email, and address are all empty, visitors
            see the same recommended defaults as below until you save official contacts.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-900 hover:bg-red-50"
            onClick={() =>
              setLanding({
                ...landing,
                bac: getRecommendedBacDirectoryContent()
              })
            }
          >
            Apply recommended BAC contact
          </button>
          {isBacDirectoryEmpty(landing.bac) ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              BAC section is empty in the database—the public site is still showing fallback text. Click the button
              above (then Save) to store these details in Supabase.
            </p>
          ) : null}
          {(
            [
              ['secretariatName', 'Secretariat / office name'],
              ['secretariatEmail', 'Email'],
              ['secretariatPhone', 'Phone'],
              ['officeAddress', 'Address'],
              ['officeNote', 'Note']
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              {key === 'officeAddress' || key === 'officeNote' ? (
                <textarea
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                  rows={key === 'officeAddress' ? 2 : 3}
                  value={(bac as Record<string, string>)[key] ?? ''}
                  onChange={(e) =>
                    setLanding({
                      ...landing,
                      bac: { ...bac, [key]: e.target.value }
                    })
                  }
                />
              ) : (
                <input
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                  value={(bac as Record<string, string>)[key] ?? ''}
                  onChange={(e) =>
                    setLanding({
                      ...landing,
                      bac: { ...bac, [key]: e.target.value }
                    })
                  }
                />
              )}
            </div>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => saveSection('bac', bac)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save BAC directory
          </button>
        </div>
      )}

      {/* Bulletins */}
      {tab === 'bulletins' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Public list at <Link className="text-red-900 underline" to="/bid-bulletins">/bid-bulletins</Link>. Attachments:
            paste file URLs, or upload in Supabase Storage to the <code className="text-xs bg-red-50 px-1 rounded">bid-bulletin-attachments</code> bucket.
          </p>
          <ul className="space-y-2">
            {bulletins.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl border border-red-100 bg-white"
              >
                <div>
                  <p className="font-medium text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {b.type} · {b.referenceNo}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditBulletin(b)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-sm hover:bg-red-50"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBulletin(b.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editingBulletinId ? 'Edit bulletin' : 'New bulletin'}</h2>
              {editingBulletinId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBulletinId(null);
                    setBulletinForm(emptyBulletin());
                    setChangesText('');
                  }}
                  className="text-sm text-gray-600 inline-flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              ) : null}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <select
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                value={bulletinForm.type}
                onChange={(e) => setBulletinForm({ ...bulletinForm, type: e.target.value })}
              >
                {['Bulletins', 'Supplemental', 'Notice'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="rounded border border-red-200 px-2 py-1.5 text-sm"
                placeholder="Status"
                value={bulletinForm.status}
                onChange={(e) => setBulletinForm({ ...bulletinForm, status: e.target.value })}
              />
            </div>
            <Field
              label="Title"
              value={bulletinForm.title}
              onChange={(v) => setBulletinForm({ ...bulletinForm, title: v })}
            />
            <Field
              label="Reference no."
              value={bulletinForm.referenceNo}
              onChange={(v) => setBulletinForm({ ...bulletinForm, referenceNo: v })}
            />
            <Field
              label="Date (YYYY-MM-DD)"
              value={bulletinForm.date}
              onChange={(v) => setBulletinForm({ ...bulletinForm, date: v })}
            />
            <Field
              label="Related to"
              value={bulletinForm.relatedTo ?? ''}
              onChange={(v) => setBulletinForm({ ...bulletinForm, relatedTo: v })}
            />
            <label className="block text-xs font-medium text-gray-700">Description</label>
            <textarea
              value={bulletinForm.description ?? ''}
              onChange={(e) => setBulletinForm({ ...bulletinForm, description: e.target.value })}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              rows={3}
            />
            <label className="block text-xs font-medium text-gray-700">Changes (one per line)</label>
            <textarea
              value={changesText}
              onChange={(e) => setChangesText(e.target.value)}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-mono"
              rows={3}
            />
            <p className="text-xs text-gray-500">Attachments (JSON or add via Storage): use edit after save to paste URLs in DB, or extend UI later.</p>
            <button
              type="button"
              disabled={saving}
              onClick={saveBulletin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingBulletinId ? 'Update bulletin' : 'Create bulletin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
