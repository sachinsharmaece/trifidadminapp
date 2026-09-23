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

// Staff-assisted enquiries — new, not in the original API_CONTRACT.md.
export function staffRegisterBuyer(
  accessToken: string,
  input: {
    mobile: string;
    firm: string;
    gstin: string;
    ownerName: string;
    licenceNo: string;
    gstPpobAddress: string;
    dealerships?: Array<{ manufacturerId: string; isStrong?: boolean }>;
    bankDetail: { accountNumber: string; ifsc: string; accountName: string };
    consent: { noticeVersion: string; marketingOptIn: boolean };
    callNote: string;
  },
): Promise<{ registrationId: string }> {
  return apiFetch('/staff/registrations/buyer', { method: 'POST', body: input, accessToken });
}

export function staffRegisterSeller(
  accessToken: string,
  input: {
    mobile: string;
    firm: string;
    gstin: string;
    ownerName: string;
    licenceNo: string;
    references: Array<{ firm: string; phone: string; relationship: string; whatTheySaid: string }>;
    bankDetail: { accountNumber: string; ifsc: string; accountName: string };
    consent: { noticeVersion: string; marketingOptIn: boolean };
    callNote: string;
  },
): Promise<{ registrationId: string }> {
  return apiFetch('/staff/registrations/seller', { method: 'POST', body: input, accessToken });
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
