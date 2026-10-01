// B-33/B-27 — the one place every Sales screen turns a raw stored value
// into what a person reads: Indian-grouped rupees, and plain-English labels
// for the condition-set/state codes that were showing up verbatim
// (`over12`, `48h`, `awaiting_payment`, a pool name built from a condition
// key). Built once here rather than each screen re-deriving its own.

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Generic snake_case → "snake case" fallback for a code with no entry below. */
export function humanizeCode(value: string): string {
  return value.replaceAll('_', ' ');
}

export const EXPIRY_BAND_LABEL: Record<string, string> = {
  over12: 'Over 12 months',
  under12: 'Under 12 months',
};

export const MOQ_BAND_LABEL: Record<string, string> = {
  '1': 'No MOQ',
  up25: 'Up to 25 boxes',
  '26-100': '26–100 boxes',
  '101-250': '101–250 boxes',
  '250+': '250+ boxes',
};

export const DELIVERY_BAND_LABEL: Record<string, string> = {
  '48h': 'Within 48 hours',
  '2-5d': '2–5 days',
};

export const PROVENANCE_LABEL: Record<string, string> = {
  company: 'Company billing',
  auth: 'My stock',
};

/** An SO's `state` — the same values `SalesOrdersPage.tsx`'s own `stateTone` already keys on. */
export const SO_STATE_LABEL: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  payment_verifying: 'Payment verifying',
  po_released: 'PO released',
  dispatched_leg1: 'Dispatched to Indore',
  at_indore: 'At Indore',
  inspected: 'Inspected',
  billed_in_marg: 'Billed in Marg',
  dispatched_leg2: 'Dispatched to buyer',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
  supply_failed: 'Supply failed',
  disputed: 'Disputed',
  promotion_offered: 'Replacement offered',
};

export const ASK_STATE_LABEL: Record<string, string> = {
  open: 'Open',
  quoted: 'Quoted',
  converted: 'Converted',
  withdrawn: 'Withdrawn',
  lapsed: 'Lapsed',
};

export function expiryBandLabel(value: string): string {
  return EXPIRY_BAND_LABEL[value] ?? humanizeCode(value);
}

export function moqBandLabel(value: string): string {
  return MOQ_BAND_LABEL[value] ?? humanizeCode(value);
}

export function deliveryBandLabel(value: string): string {
  return DELIVERY_BAND_LABEL[value] ?? humanizeCode(value);
}

export function provenanceLabel(value: string): string {
  return PROVENANCE_LABEL[value] ?? humanizeCode(value);
}

export function soStateLabel(value: string): string {
  return SO_STATE_LABEL[value] ?? humanizeCode(value);
}

// BR-030/031 — the coarse 7-step chain strip, already a field (`chain.stage`)
// this just orders and labels for display.
export const CHAIN_STAGE_ORDER = [
  'so',
  'payment',
  'po',
  'leg1',
  'marg',
  'dispatch',
  'done',
] as const;

export const CHAIN_STAGE_LABEL: Record<string, string> = {
  so: 'Order placed',
  payment: 'Payment',
  po: 'PO released',
  leg1: 'To Indore',
  marg: 'Billed in Marg',
  dispatch: 'To buyer',
  done: 'Done',
};

export function chainStageLabel(value: string): string {
  return CHAIN_STAGE_LABEL[value] ?? humanizeCode(value);
}

export function askStateLabel(value: string): string {
  return ASK_STATE_LABEL[value] ?? humanizeCode(value);
}

/**
 * A pool's own name is built from its condition-set key server-side
 * (`buildConditionSetKey` — expiryBand|moqBand|deliveryBand|provenance
 * joined raw); this renders that same key as English instead.
 */
export function poolConditionLabel(key: {
  expiryBand: string;
  moqBand: string;
  deliveryBand: string;
  provenance: string;
}): string {
  return [
    expiryBandLabel(key.expiryBand),
    moqBandLabel(key.moqBand),
    deliveryBandLabel(key.deliveryBand),
    provenanceLabel(key.provenance),
  ].join(' · ');
}
