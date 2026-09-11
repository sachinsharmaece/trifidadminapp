import { apiFetch } from './client';

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
): Promise<{ movementId: string }> {
  return apiFetch(`/staff/chains/${chainId}/movements`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
