import type { RateTier } from './party';

/** The buyer tiers a margin is set for, in display order. A copy of BUYER_TIERS in trifidserverapp/src/shared/enums.ts. */
export const BUYER_TIERS = [
  'TRADER',
  'DISTRIBUTOR',
  'DEALER',
  'RETAILER',
] as const satisfies readonly RateTier[];
export type BuyerTier = (typeof BUYER_TIERS)[number];

/** What a margin line is today: in use now, starting later, or replaced by a newer one. */
export const CELL_STATUSES = ['CURRENT', 'SCHEDULED', 'PAST'] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];

export const CELL_STATUS_LABELS: Record<CellStatus, string> = {
  CURRENT: 'In use',
  SCHEDULED: 'Scheduled',
  PAST: 'Replaced',
};
