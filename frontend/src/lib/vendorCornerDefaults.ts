import type { LandingVendor } from '../types/database';

/** Shown on the public landing when `landing_page.vendor` has no URLs/links. */
export const VENDOR_CORNER_FALLBACK_FEATURES = [
  {
    to: '/accreditation-portal',
    title: 'Accreditation Portal',
    description: 'View qualified and disqualified suppliers accredited for WMSU procurement.',
    iconKey: 'accreditation' as const
  },
  {
    to: '/supplier-register',
    title: 'Supplier registration',
    description: 'Register your business and submit requirements to participate in bidding.',
    iconKey: 'register' as const
  }
];

/** Prefills Procurement portal → Vendor corner so the public page matches the fallback richness (editable after). */
export function getRecommendedVendorCornerContent(): LandingVendor {
  return {
    accreditationTitle: 'Accreditation Portal',
    accreditationDescription:
      'Official lists of qualified and disqualified suppliers for WMSU procurement.',
    accreditationUrl: '/accreditation-portal',
    loginTitle: '',
    loginDescription: '',
    loginUrl: '',
    links: [
      {
        label: 'Supplier registration',
        url: '/supplier-register',
        description: 'Submit your company profile and documents to join bidding.'
      }
    ]
  };
}
