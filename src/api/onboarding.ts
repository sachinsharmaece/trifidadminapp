import { apiFetch } from './client';
import type { RegistrationListItem, RegistrationStatusDto } from './dto';

// API-013
export function listRegistrations(
  accessToken: string,
  stage?: string,
): Promise<RegistrationListItem[]> {
  const query = stage ? `?stage=${encodeURIComponent(stage)}` : '';
  return apiFetch(`/staff/registrations${query}`, { accessToken });
}

// API-012
export function getRegistration(accessToken: string, id: string): Promise<RegistrationStatusDto> {
  return apiFetch(`/registrations/${id}`, { accessToken });
}

// API-014, buyer branch.
export function approveBuyer(
  accessToken: string,
  id: string,
  input: {
    tehsilId: string;
    tradePosition: 'distributor' | 'dealer' | 'retailer';
    isTrader: boolean;
  },
): Promise<{ approved: boolean }> {
  return apiFetch(`/staff/registrations/${id}/approve`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-014, seller branch.
export function approveSeller(
  accessToken: string,
  id: string,
  input: {
    tehsilIds: string[];
    dispatchCutoffTime: string;
    trustTier?: string;
    seedReason?: string;
  },
): Promise<{ approved: boolean }> {
  return apiFetch(`/staff/registrations/${id}/approve`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-015
export function rejectRegistration(
  accessToken: string,
  id: string,
  reason: string,
): Promise<{ rejected: boolean }> {
  return apiFetch(`/staff/registrations/${id}/reject`, {
    method: 'POST',
    body: { reason },
    accessToken,
  });
}
