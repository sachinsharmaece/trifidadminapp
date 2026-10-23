/**
 * API_CONTRACT.md §1 — a fresh key per distinct action, sent as the
 * `Idempotency-Key` header (middleware/idempotency.ts on the server). Same
 * fallback as trifidbuyersellerapp's copy: `crypto.randomUUID` is missing on
 * older WebViews and on a non-secure (plain http) origin.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
