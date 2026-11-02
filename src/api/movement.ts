import { apiFetch } from './client';
import { newIdempotencyKey } from '../lib/idempotency';

// API-089 — BR-176, two dispatch modes, both legs.
export function recordMovement(
  accessToken: string,
  chainId: string,
  input: {
    leg: 1 | 2;
    mode: 'transport' | 'bus';
    transporter?: string;
    lr?: string;
    busNo?: string;
    driver?: string;
    driverMobile?: string;
    photoRef?: string;
    freightTerms: 'prepaid' | 'to_pay';
    freightAmountPaise: number;
  },
  // Required by the server on this route (see api/chain.ts).
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ movementId: string }> {
  return apiFetch(`/staff/chains/${chainId}/movements`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}
