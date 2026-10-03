import { apiFetch } from './client';

function idempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// API-088. BR-033 — no override field exists on this input, for any role.
// Money-moving (B-55): needs Idempotency-Key like every other stage-moving POST.
export function keyMargInvoice(
  accessToken: string,
  soId: string,
  input: { margInvoiceNo: string; date: string; valuePaise: number; ewayNo: string },
): Promise<{ margBillId: string; state: 'matched' | 'query' }> {
  return apiFetch(`/staff/marg/${soId}`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}
