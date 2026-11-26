/**
 * Leg 1, the Indore dock and return notes, as the API uses them (server: shared/enums.ts). Build 3, LOCK-40.
 */

/** RAISED at Gate A → DISPATCHED (leg 1) → ARRIVED (at the dock) → CHECKED (Gate B) or REJECTED (nothing passed). */
export const PURCHASE_ORDER_STATUSES = [
  'RAISED',
  'DISPATCHED',
  'ARRIVED',
  'CHECKED',
  'REJECTED',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  RAISED: 'Raised',
  DISPATCHED: 'On the way',
  ARRIVED: 'At the dock',
  CHECKED: 'Checked',
  REJECTED: 'Rejected at the dock',
};

export const LEG1_MODES = ['TRANSPORT', 'BUS', 'DEPOT'] as const;
export type Leg1Mode = (typeof LEG1_MODES)[number];

export const LEG1_MODE_LABELS: Record<Leg1Mode, string> = {
  TRANSPORT: 'Transport company',
  BUS: 'Bus parcel',
  DEPOT: 'From a depot',
};

export const FREIGHT_TERMS = ['PAID', 'TO_PAY'] as const;
export type FreightTerms = (typeof FREIGHT_TERMS)[number];

export const FREIGHT_TERM_LABELS: Record<FreightTerms, string> = {
  PAID: 'Paid by the seller',
  TO_PAY: 'To pay at Indore',
};

export const INSPECTION_OUTCOMES = ['O1', 'O2', 'O3', 'O4', 'O5'] as const;
export type InspectionOutcome = (typeof INSPECTION_OUTCOMES)[number];

/** LOCK-40 A2, in words. */
export const OUTCOME_LABELS: Record<InspectionOutcome, string> = {
  O1: 'All accepted',
  O2: 'Some damaged or leaking',
  O3: 'Some boxes short',
  O4: 'Nothing accepted',
  O5: 'Extra boxes came',
};

export const RETURN_NOTE_TYPES = ['REJECTED', 'EXCESS'] as const;
export type ReturnNoteType = (typeof RETURN_NOTE_TYPES)[number];

export const RETURN_NOTE_TYPE_LABELS: Record<ReturnNoteType, string> = {
  REJECTED: 'Damaged or leaking',
  EXCESS: 'Extra boxes',
};

export const RETURN_CLOSURES = ['PICKED_UP', 'SHIPPED_BACK', 'DISPOSED'] as const;
export type ReturnClosure = (typeof RETURN_CLOSURES)[number];

export const RETURN_CLOSURE_LABELS: Record<ReturnClosure, string> = {
  PICKED_UP: 'The seller picked it up',
  SHIPPED_BACK: 'We shipped it back',
  DISPOSED: 'Disposed of',
};

/** Trips (leg 2): PLANNED → OUT → CLOSED (when every bill has a POD). */
export const TRIP_STATUSES = ['PLANNED', 'OUT', 'CLOSED'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  PLANNED: 'Planned',
  OUT: 'Out',
  CLOSED: 'Closed',
};

/** How a bill goes on from our vehicle. */
export const BOOK_WITH_MODES = ['TRANSPORT', 'BUS', 'DIRECT'] as const;
export type BookWithMode = (typeof BOOK_WITH_MODES)[number];

export const BOOK_WITH_LABELS: Record<BookWithMode, string> = {
  TRANSPORT: 'Transport company',
  BUS: 'Bus parcel',
  DIRECT: 'Our vehicle delivers it',
};
