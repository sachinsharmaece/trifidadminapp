import { apiFetch } from './client';

// API-088. BR-033 — no override field exists on this input, for any role.
export function keyMargInvoice(
  accessToken: string,
  soId: string,
  input: { margInvoiceNo: string; date: string; valuePaise: number; ewayNo: string },
): Promise<{ margBillId: string; state: 'matched' | 'query' }> {
  return apiFetch(`/staff/marg/${soId}`, { method: 'POST', body: input, accessToken });
}
