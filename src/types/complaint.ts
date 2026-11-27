/** Complaints (Build 6), as the API uses them (server: shared/enums.ts). */

export const COMPLAINT_CATEGORIES = [
  'DAMAGE_ON_ARRIVAL',
  'SHORTAGE',
  'WRONG_ITEM',
  'QUALITY_COMPLAINT',
  'OTHER',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  DAMAGE_ON_ARRIVAL: 'Damaged on arrival',
  SHORTAGE: 'Boxes short',
  WRONG_ITEM: 'Wrong item',
  QUALITY_COMPLAINT: 'Quality complaint',
  OTHER: 'Other',
};

export const COMPLAINT_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Decided',
};

/** What the Controller decides. Only a credit, a refund (and its boxes) move money; the rest are recorded decisions. */
export const COMPLAINT_OUTCOMES = [
  'NO_ACTION',
  'CREDIT',
  'REPLACEMENT',
  'RETURN',
  'REFUND',
] as const;
export type ComplaintOutcome = (typeof COMPLAINT_OUTCOMES)[number];
export const COMPLAINT_OUTCOME_LABELS: Record<ComplaintOutcome, string> = {
  NO_ACTION: 'No action (complaint not accepted)',
  CREDIT: 'Credit note (money off his account)',
  REPLACEMENT: 'Replacement (we send new boxes)',
  RETURN: 'Return (he sends boxes back)',
  REFUND: 'Refund (money back through Payouts)',
};
/** The short name, for badges and lines. */
export const COMPLAINT_OUTCOME_SHORT: Record<ComplaintOutcome, string> = {
  NO_ACTION: 'No action',
  CREDIT: 'Credit note',
  REPLACEMENT: 'Replacement',
  RETURN: 'Return',
  REFUND: 'Refund',
};

/** The Controller's decision as the API takes it. A credit takes money (paise); the others that move goods take boxes. */
export type ResolveComplaintInput =
  | { outcome: 'NO_ACTION'; note: string }
  | { outcome: 'CREDIT'; amountPaise: number; note: string }
  | { outcome: 'REPLACEMENT' | 'RETURN' | 'REFUND'; boxes: number; note: string };
