/** The books and payments, as the API uses them (server: shared/enums.ts). */
export const BANK_KINDS = ['CURRENT', 'UPI'] as const;
export type BankKind = (typeof BANK_KINDS)[number];
export const BANK_KIND_LABELS: Record<BankKind, string> = {
  CURRENT: 'Current account',
  UPI: 'UPI collections',
};

/** A payment Sales entered: waiting for Accounts, confirmed (posted to the books), or not found in the bank. */
export const RECEIPT_STATUSES = ['LOGGED', 'POSTED', 'REJECTED'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];
export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  LOGGED: 'Waiting for Accounts',
  POSTED: 'Confirmed',
  REJECTED: 'Not received',
};
export const RECEIPT_STATUS_TONES = {
  LOGGED: 'warning',
  POSTED: 'success',
  REJECTED: 'danger',
} as const;
