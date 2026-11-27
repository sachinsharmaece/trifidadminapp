/** Payouts (Build 5), as the API uses them (server: shared/enums.ts). */

/** A batch is built (DRAFT), released by someone else (RELEASED), or dropped before release (CANCELLED). */
export const PAYOUT_BATCH_STATUSES = ['DRAFT', 'RELEASED', 'CANCELLED'] as const;
export type PayoutBatchStatus = (typeof PAYOUT_BATCH_STATUSES)[number];
export const PAYOUT_BATCH_STATUS_LABELS: Record<PayoutBatchStatus, string> = {
  DRAFT: 'Draft: waiting for release',
  RELEASED: 'Released',
  CANCELLED: 'Cancelled',
};
export const PAYOUT_BATCH_STATUS_TONES = {
  DRAFT: 'warning',
  RELEASED: 'info',
  CANCELLED: 'neutral',
} as const;

/** A line pays a seller for the goods (PAYOUT) or gives a buyer his money back (REFUND). */
export const PAYOUT_LINE_TYPES = ['PAYOUT', 'REFUND'] as const;
export type PayoutLineType = (typeof PAYOUT_LINE_TYPES)[number];
export const PAYOUT_LINE_TYPE_LABELS: Record<PayoutLineType, string> = {
  PAYOUT: 'Seller payment',
  REFUND: 'Buyer refund',
};

/** A line is PAID only when its bank proof (the UTR) is typed: no proof, not paid. */
export const PAYOUT_LINE_STATUSES = ['DRAFT', 'PROOF_PENDING', 'PAID'] as const;
export type PayoutLineStatus = (typeof PAYOUT_LINE_STATUSES)[number];
export const PAYOUT_LINE_STATUS_LABELS: Record<PayoutLineStatus, string> = {
  DRAFT: 'In the draft',
  PROOF_PENDING: 'Waiting for the bank proof',
  PAID: 'Paid',
};
export const PAYOUT_LINE_STATUS_TONES = {
  DRAFT: 'neutral',
  PROOF_PENDING: 'warning',
  PAID: 'success',
} as const;

export const REFUND_STATUSES = ['DUE', 'PAID'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
