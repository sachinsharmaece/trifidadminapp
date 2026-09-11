import { apiFetch } from './client';
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
export function refreshSession(): Promise<{ accessToken: string }> {
  return apiFetch('/auth/refresh', { method: 'POST' });
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
