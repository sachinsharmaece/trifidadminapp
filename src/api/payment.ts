import { apiFetch } from './client';
import type { PurchaseRegisterRow, SalesRegisterRow, UpcomingReceiptListItem } from './dto';

// The server requires an Idempotency-Key on every money-moving POST (middleware/idempotency.ts).
// One key per user action: a retry of the same click may reuse it, a new click gets a new one.
export function newIdempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// API-080.
export function getUpcomingReceipts(accessToken: string): Promise<UpcomingReceiptListItem[]> {
  return apiFetch('/staff/upcoming-receipts', { accessToken });
}

// API-081 — BR-012, Sales picks which SOs a claim covers.
export function allocateUpcomingReceipt(
  accessToken: string,
  upcomingReceiptId: string,
  soIds: string[],
): Promise<{ allocated: boolean }> {
  return apiFetch(`/staff/upcoming-receipts/${upcomingReceiptId}/allocate`, {
    method: 'POST',
    body: { soIds },
    accessToken,
  });
}

// API-082 — BR-027, every mark carries a UTR and a person.
export function postBankCredit(
  accessToken: string,
  upcomingReceiptId: string,
  input: { utr: string; remitterAccountNumber: string; remitterIfsc: string },
): Promise<{ bankbookId: string }> {
  return apiFetch(`/staff/bank/${upcomingReceiptId}/post`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

// API-083 — Controller only, requires X-Reauth-Token (BR-015).
export function repostBankEntry(
  accessToken: string,
  reauthToken: string,
  bankbookId: string,
  input: {
    reason: string;
    corrected: {
      kind: 'in' | 'out';
      purpose: 'receipt' | 'payout' | 'refund';
      partyId: string;
      partyType: 'buyer' | 'seller';
      amountPaise: number;
    };
  },
): Promise<{ reversalId: string; correctedId: string }> {
  return apiFetch(`/staff/bank/${bankbookId}/repost`, {
    method: 'POST',
    body: input,
    accessToken,
    reauthToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

// API-086 — isPayable derives from the three gates and bank_detail (INV-17).
// B-59 — now also names which gate is blocking, not just a bare boolean.
export type PoPayabilityReason =
  | 'PO_NOT_ACTIVE'
  | 'INSPECTION_PENDING'
  | 'SELLER_BILL_NOT_BOOKED'
  | 'ACCOUNTS_CONFIRMATION_PENDING'
  | 'BANK_DETAIL_NOT_PAYABLE';

export function getPoPayable(
  accessToken: string,
  poId: string,
): Promise<{ payable: boolean; reason?: PoPayabilityReason }> {
  return apiFetch(`/staff/payables/${poId}`, { accessToken });
}

// Staff-assisted enquiries, decision (B) — Accounts' own dedicated
// confirmation, distinct from the dock's inspection record.
export function recordReceiptConfirmation(
  accessToken: string,
  poId: string,
  input: { productMatches: boolean; qtyMatches: boolean; notes?: string },
): Promise<{ receiptConfirmationId: string }> {
  return apiFetch(`/staff/pos/${poId}/receipt-confirmation`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-085 build.
export function buildPaymentRun(
  accessToken: string,
  items: Array<{ kind: 'payout' | 'refund'; refId: string }>,
): Promise<{ paymentRunId: string }> {
  return apiFetch('/staff/payment-runs', {
    method: 'POST',
    body: { items },
    accessToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

// API-085 release — INV-16, requires X-Reauth-Token; 403 if the releaser built it.
export function releasePaymentRun(
  accessToken: string,
  reauthToken: string,
  paymentRunId: string,
  utrs?: string[],
): Promise<{ released: boolean }> {
  return apiFetch(`/staff/payment-runs/${paymentRunId}/release`, {
    method: 'POST',
    body: { utrs },
    accessToken,
    reauthToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

// The checker's "no" on a built batch. Nothing moves; its items are free for a new batch.
export function sendBackPaymentRun(
  accessToken: string,
  paymentRunId: string,
  reason: string,
): Promise<{ sentBack: boolean }> {
  return apiFetch(`/staff/payment-runs/${paymentRunId}/send-back`, {
    method: 'POST',
    body: { reason },
    accessToken,
    idempotencyKey: newIdempotencyKey(),
  });
}

// BR-017 — logs the call-back to the number already on file; the new account becomes
// payable 24 hours later. `bankDetailId` is the pending detail, not the counterparty.
export function logBankDetailCallback(accessToken: string, bankDetailId: string): Promise<unknown> {
  return apiFetch(`/staff/bank-details/${bankDetailId}/callback`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}

// BR-308.
export function runDayClose(
  accessToken: string,
  statementClosingPaise: number,
): Promise<{ closingPaise: number }> {
  return apiFetch('/staff/day-close', {
    method: 'POST',
    body: { statementClosingPaise },
    accessToken,
  });
}

export function getSalesRegister(accessToken: string): Promise<SalesRegisterRow[]> {
  return apiFetch('/staff/registers/sales', { accessToken });
}

export function getPurchaseRegister(accessToken: string): Promise<PurchaseRegisterRow[]> {
  return apiFetch('/staff/registers/purchase', { accessToken });
}

export function getBuyerLedger(
  accessToken: string,
  buyerId: string,
): Promise<{ ledgerPaise: number }> {
  return apiFetch(`/staff/buyers/${buyerId}/ledger`, { accessToken });
}

export function getSellerLedger(
  accessToken: string,
  sellerId: string,
): Promise<{ ledgerPaise: number }> {
  return apiFetch(`/staff/sellers/${sellerId}/ledger`, { accessToken });
}

// M7, BR-023 — the one genuine new Accounts gap: the field existed since M4
// with nothing reading it.
export interface GstUnfiledItem {
  sellerBillId: string;
  billNo: string;
  sellerId: string;
  totalPaise: number;
  date: string;
}

export function getGstUnfiledQueue(accessToken: string): Promise<GstUnfiledItem[]> {
  return apiFetch('/staff/accounts/gst-unfiled', { accessToken });
}

export function markSellerBillFiled(
  accessToken: string,
  sellerBillId: string,
): Promise<{ filed: boolean }> {
  return apiFetch(`/staff/accounts/seller-bills/${sellerBillId}/mark-filed`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}
