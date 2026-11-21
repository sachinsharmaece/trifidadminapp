/**
 * The choices on a listing. Copies of the lists in trifidserverapp/src/shared/enums.ts: change both together.
 */
export const LISTING_RATE_TYPES = ['FOR', 'EX'] as const;
export type ListingRateType = (typeof LISTING_RATE_TYPES)[number];

/** How much shelf life the goods have left. Under 6 months is not accepted. */
export const EXPIRY_BANDS = ['M6_TO_9', 'M9_TO_12', 'M12_PLUS'] as const;
export type ExpiryBand = (typeof EXPIRY_BANDS)[number];

/** Where the goods come from. SOURCED is shown to people as "Company billing". */
export const PROVENANCES = ['OWN_STOCK', 'SOURCED'] as const;
export type Provenance = (typeof PROVENANCES)[number];

export const LISTING_STATUSES = ['ACTIVE', 'PAUSED', 'EXPIRED', 'WITHDRAWN'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const RATE_TYPE_LABELS: Record<ListingRateType, string> = {
  FOR: 'FOR Indore',
  EX: 'Ex rate + COL',
};

export const EXPIRY_BAND_LABELS: Record<ExpiryBand, string> = {
  M6_TO_9: '6 to 9 months',
  M9_TO_12: '9 to 12 months',
  M12_PLUS: '12 months or more',
};

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  OWN_STOCK: 'Own stock',
  SOURCED: 'Company billing',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  EXPIRED: 'Expired',
  WITHDRAWN: 'Withdrawn',
};
