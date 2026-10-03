import { apiFetch } from './client';

function idempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// API-087 — BR-182/BR-184, outer box only, immutable once submitted.
export function recordInspection(
  accessToken: string,
  poId: string,
  input: { casesAccepted: number; casesRejected: number; reasons: string[]; photoRefs: string[] },
): Promise<{ inspectionId: string }> {
  return apiFetch(`/staff/pos/${poId}/inspections`, { method: 'POST', body: input, accessToken });
}

// BR-190 — Purchase converts the dock's finding into a payment consequence.
// Money-moving (B-55): needs Idempotency-Key like every other stage-moving POST.
export function applyInspection(
  accessToken: string,
  poId: string,
): Promise<{ soState: string; sellerBillId?: string; debitNoteId?: string; refundId?: string }> {
  return apiFetch(`/staff/pos/${poId}/inspections/apply`, {
    method: 'POST',
    body: {},
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}
