import { apiFetch } from './client';

// API-087 — BR-182/BR-184, outer box only, immutable once submitted.
export function recordInspection(
  accessToken: string,
  poId: string,
  input: { casesAccepted: number; casesRejected: number; reasons: string[]; photoRefs: string[] },
): Promise<{ inspectionId: string }> {
  return apiFetch(`/staff/pos/${poId}/inspections`, { method: 'POST', body: input, accessToken });
}

// BR-190 — Purchase converts the dock's finding into a payment consequence.
export function applyInspection(
  accessToken: string,
  poId: string,
): Promise<{ soState: string; sellerBillId?: string; debitNoteId?: string; refundId?: string }> {
  return apiFetch(`/staff/pos/${poId}/inspections/apply`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}
