import { apiFetch } from './client';
import type { PurchaseRegisterRow, SalesRegisterRow, UpcomingReceiptListItem } from './dto';

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
  });
}

// API-086 — isPayable derives from the three gates and bank_detail (INV-17).
export function getPoPayable(accessToken: string, poId: string): Promise<{ payable: boolean }> {
  return apiFetch(`/staff/payables/${poId}`, { accessToken });
}

// API-085 build.
export function buildPaymentRun(
  accessToken: string,
  items: Array<{ kind: 'payout' | 'refund'; refId: string }>,
): Promise<{ paymentRunId: string }> {
  return apiFetch('/staff/payment-runs', { method: 'POST', body: { items }, accessToken });
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
