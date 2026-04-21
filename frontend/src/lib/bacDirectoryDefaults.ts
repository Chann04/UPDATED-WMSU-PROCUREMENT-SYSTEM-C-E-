import type { LandingBac } from '../types/database';

/** Shown on the public landing when `landing_page.bac` is missing or has no name, email, or address. */
export const BAC_DIRECTORY_FALLBACK: LandingBac = {
  secretariatName: 'Procurement Office — BAC Secretariat',
  secretariatEmail: 'procurement@wmsu.edu.ph',
  secretariatPhone: '991-1771',
  officeAddress: 'Western Mindanao State University, Normal Road, Baliwasan, Zamboanga City',
  officeNote:
    'For bids, supplements, and awards inquiries, please contact the Bids and Awards Committee Secretariat during office hours (Monday–Friday, 8:00 AM–5:00 PM).'
};

export function getRecommendedBacDirectoryContent(): LandingBac {
  return { ...BAC_DIRECTORY_FALLBACK };
}

export function isBacDirectoryEmpty(bac: LandingBac | undefined): boolean {
  if (!bac) return true;
  return (
    !String(bac.secretariatName || '').trim() &&
    !String(bac.secretariatEmail || '').trim() &&
    !String(bac.officeAddress || '').trim()
  );
}
