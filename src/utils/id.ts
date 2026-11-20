/**
 * A fresh random id for the Idempotency-Key header.
 * crypto.randomUUID only exists on https:// and localhost, so on a plain http:// address
 * (e.g. opening the dev server from a phone on your LAN) we build a v4 UUID by hand.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Mark the bytes as "version 4, variant 10" as the UUID spec requires.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
