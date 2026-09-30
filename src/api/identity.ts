import { apiFetch } from './client';
import { ApiError } from './errors';
import type { StaffMeDto } from './dto';

export interface StaffLoginResult {
  mfaRequired: boolean;
  mfaToken?: string;
  expiresIn?: number;
  accessToken?: string;
  me?: StaffMeDto;
}

// API-003
export function staffLogin(email: string, password: string): Promise<StaffLoginResult> {
  return apiFetch<StaffLoginResult>('/auth/staff/login', {
    method: 'POST',
    body: { email, password },
  });
}

// API-004
export function staffMfaVerify(
  mfaToken: string,
  code: string,
): Promise<{ accessToken: string; me: StaffMeDto }> {
  return apiFetch('/auth/staff/mfa/verify', { method: 'POST', body: { mfaToken, code } });
}

// API-005 — relies on the httpOnly refresh cookie; nothing else to send.
// B-46 — this call had no timeout or retry at all; a slow Render cold start
// on the free tier looked identical to "session expired" (B-45). A short
// retry-with-backoff, scoped to this one call site only — not a general
// retry framework — masks that without touching the auth design.
const REFRESH_RETRY_DELAYS_MS = [500, 1500];

export async function refreshSession(): Promise<{ accessToken: string }> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
    } catch (error) {
      const canRetry =
        attempt < REFRESH_RETRY_DELAYS_MS.length && error instanceof ApiError && error.retryable;
      if (!canRetry) throw error;
      await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAYS_MS[attempt]));
    }
  }
}

// API-006
export function logout(accessToken: string): Promise<{ loggedOut: boolean }> {
  return apiFetch('/auth/logout', { method: 'POST', body: {}, accessToken });
}

// API-008
export function getMe(accessToken: string): Promise<StaffMeDto> {
  return apiFetch('/me', { accessToken });
}

// API-007 — CH §24.2, required immediately before a money-moving action.
export function reauth(
  accessToken: string,
  password: string,
  mfaCode?: string,
): Promise<{ reauthToken: string; expiresIn: number }> {
  return apiFetch('/auth/reauth', { method: 'POST', body: { password, mfaCode }, accessToken });
}
