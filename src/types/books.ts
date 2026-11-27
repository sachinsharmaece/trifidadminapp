/** The books and payments, as the API uses them (server: shared/enums.ts). */
export const BANK_KINDS = ['CURRENT', 'UPI'] as const;
export type BankKind = (typeof BANK_KINDS)[number];
export const BANK_KIND_LABELS: Record<BankKind, string> = {
  CURRENT: 'Current account',
  UPI: 'UPI collections',
};

/**
 * A payment: waiting for Accounts (LOGGED), confirmed and posted to the books (POSTED), not found in the bank
 * (REJECTED), or undone by a reversal (REVERSED, only a hand-added payment that was never used).
 */
export const RECEIPT_STATUSES = ['LOGGED', 'POSTED', 'REJECTED', 'REVERSED'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];
export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  LOGGED: 'Waiting for Accounts',
  POSTED: 'Confirmed',
  REJECTED: 'Not received',
  REVERSED: 'Reversed',
};
export const RECEIPT_STATUS_TONES = {
  LOGGED: 'warning',
  POSTED: 'success',
  REJECTED: 'danger',
  REVERSED: 'neutral',
} as const;

/** Where a payment came from: Sales entered it against an order, or Accounts added money that came with no order. */
export const RECEIPT_SOURCES = ['SALES_ENTRY', 'HAND_ADDED'] as const;
export type ReceiptSource = (typeof RECEIPT_SOURCES)[number];

/** A hand-typed journal entry, or the balances the books start from (one flow, two kinds). */
export const JOURNAL_KINDS = ['JOURNAL', 'OPENING'] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];
export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  JOURNAL: 'Journal entry',
  OPENING: 'Opening balances',
};

/** Typed (waiting for a different person), posted, said no to, withdrawn, or undone by a reversal. */
export const JOURNAL_STATUSES = [
  'PENDING_APPROVAL',
  'POSTED',
  'REJECTED',
  'CANCELLED',
  'REVERSED',
] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];
export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  PENDING_APPROVAL: 'Waiting for approval',
  POSTED: 'Posted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REVERSED: 'Reversed',
};
export const JOURNAL_STATUS_TONES = {
  PENDING_APPROVAL: 'warning',
  POSTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  REVERSED: 'neutral',
} as const;

/** The groups a ledger may be added to by hand (buyers, sellers and bank accounts get theirs from their own screens). */
export const HAND_LEDGER_GROUPS = [
  'Direct Expenses',
  'Indirect Expenses',
  'Indirect Income',
  'Duties & Taxes',
  'Capital',
  'Loans',
  'Cash',
] as const;

/** The kinds of voucher in the books. A reversal is the exact mirror of the voucher it undoes. */
export const VOUCHER_TYPES = [
  'RECEIPT',
  'SALES',
  'PURCHASE',
  'PAYMENT',
  'JOURNAL',
  'REVERSAL',
] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];
export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  RECEIPT: 'Receipt',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  PAYMENT: 'Payment',
  JOURNAL: 'Journal',
  REVERSAL: 'Reversal',
};
