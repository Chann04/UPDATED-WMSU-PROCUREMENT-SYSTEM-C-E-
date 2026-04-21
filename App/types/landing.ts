/**
 * Landing page types – aligned with web (frontend/src/types/database.ts).
 * Used for Supabase landing_page + transparency_seal_entries data.
 */

export type LandingDocumentItem = {
  title: string;
  description: string;
  url: string;
  category: string;
};

export type TransparencyFeaturedItem = {
  projectTitle: string;
  referenceNo: string;
  abc: number;
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

export type TransparencySealEntry = {
  id?: string;
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
};

export type TransparencySealEntryRow = {
  id: string;
  created_at: string;
  mission: string | null;
  project_title: string;
  reference_no: string;
  abc: number;
  closing_date: string | null;
  opening_date: string | null;
  location: string | null;
  description: string | null;
  requirements: string[];
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  display_order?: number;
};

export type LandingTransparency = {
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
  items?: TransparencySealEntry[];
};

export type LandingDocuments = { items: LandingDocumentItem[] };

export type AppPlannedItem = {
  projectTitle: string;
  description: string;
  budget: number;
  month: number;
};

export type LandingPlanning = {
  appItems?: AppPlannedItem[];
  pmr?: { title?: string; description?: string; url?: string };
};

export type LandingVendor = {
  accreditationTitle: string;
  accreditationDescription: string;
  accreditationUrl: string;
  loginTitle: string;
  loginDescription: string;
  loginUrl: string;
};

export type LandingBac = {
  secretariatName: string;
  secretariatEmail: string;
  secretariatPhone: string;
  officeAddress: string;
  officeNote: string;
};

export type LandingContent = {
  transparency?: LandingTransparency;
  documents?: LandingDocuments;
  planning?: LandingPlanning;
  vendor?: LandingVendor;
  bac?: LandingBac;
};
