import { supabase } from './supabase';
import type {
  LandingContent,
  LandingTransparency,
  TransparencySealEntry,
  TransparencySealEntryRow,
  TransparencyFeaturedItem,
} from '@/types/landing';

function rowToEntry(r: TransparencySealEntryRow): TransparencySealEntry {
  return {
    mission: r.mission ?? undefined,
    featuredItem: {
      projectTitle: r.project_title,
      referenceNo: r.reference_no,
      abc: r.abc,
      closingDate: r.closing_date ?? '',
      openingDate: r.opening_date ?? undefined,
      location: r.location ?? undefined,
      description: r.description ?? undefined,
      requirements: r.requirements ?? [],
      contactPerson: r.contact_person ?? undefined,
      contactEmail: r.contact_email ?? undefined,
      contactPhone: r.contact_phone ?? undefined,
      status: r.status,
    } as TransparencyFeaturedItem,
  };
}

export const landingAPI = {
  getAll: async (): Promise<LandingContent> => {
    const [pageRes, entriesRes] = await Promise.all([
      supabase.from('landing_page').select('section, data').order('section'),
      supabase
        .from('transparency_seal_entries')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);
    if (pageRes.error) throw pageRes.error;
    const out: LandingContent = {};
    (pageRes.data || []).forEach((row: { section: string; data: unknown }) => {
      (out as Record<string, unknown>)[row.section] = row.data;
    });
    if (entriesRes.data && entriesRes.data.length > 0) {
      const items = (entriesRes.data as TransparencySealEntryRow[]).map((row) => ({
        ...rowToEntry(row),
        id: row.id,
      }));
      const last = items[items.length - 1];
      out.transparency = {
        ...(out.transparency as object),
        items,
        mission: items[0]?.mission ?? (out.transparency as LandingTransparency)?.mission,
        featuredItem:
          last?.featuredItem ?? (out.transparency as LandingTransparency)?.featuredItem,
      } as LandingTransparency;
    }
    return out;
  },
};
