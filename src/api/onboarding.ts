import { apiFetch } from './client';
import type { BuyerProfileDto, RegistrationListItem, RegistrationStatusDto } from './dto';

// API-013
export function listRegistrations(
  accessToken: string,
  stage?: string,
  limit?: number,
): Promise<RegistrationListItem[]> {
  const params = new URLSearchParams();
  if (stage) params.set('stage', stage);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return apiFetch(`/staff/registrations${query ? `?${query}` : ''}`, { accessToken });
}

// API-012
export function getRegistration(accessToken: string, id: string): Promise<RegistrationStatusDto> {
  return apiFetch(`/registrations/${id}`, { accessToken });
}

export type BuyerCategory = 'Retailer' | 'Dealer' | 'Distributor' | 'Trader';

export interface BuyerLocationInput {
  address: string;
  pincode?: string;
  stateId: string;
  districtId: string;
  tehsilId: string;
}

/** Phase 3 — "please confirm" warnings come back as CONFIRMATION_REQUIRED; send these to go ahead. */
export interface BuyerConfirmations {
  sharedMobile?: boolean;
  panInsideGstin?: boolean;
}

// API-014, buyer branch — Phase 3: category, location and Assigned to (DEC-058, DEC-062).
export function approveBuyer(
  accessToken: string,
  id: string,
  input: { category: BuyerCategory; location: BuyerLocationInput; assignedToEmployeeId: string },
  idempotencyKey: string,
): Promise<{ approved: boolean }> {
  return apiFetch(`/staff/registrations/${id}/approve`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

/** The buyer behind a registration — prefills the approval form. */
export function getRegistrationBuyerProfile(
  accessToken: string,
  registrationId: string,
): Promise<BuyerProfileDto> {
  return apiFetch(`/staff/registrations/${registrationId}/buyer-profile`, { accessToken });
}

export function getBuyerProfile(accessToken: string, buyerId: string): Promise<BuyerProfileDto> {
  return apiFetch(`/staff/buyers/${buyerId}/profile`, { accessToken });
}

export interface UpdateBuyerInput {
  firm: string;
  ownerName?: string;
  contactMobile: string;
  gstin?: string;
  pan?: string;
  category: BuyerCategory;
  location: BuyerLocationInput;
  dealerships?: Array<{ manufacturerId: string }>;
  licenceNo?: string;
  margPartyCode?: string;
  confirmations?: BuyerConfirmations;
}

export function updateBuyerProfile(
  accessToken: string,
  buyerId: string,
  input: UpdateBuyerInput,
  idempotencyKey: string,
): Promise<BuyerProfileDto> {
  return apiFetch(`/staff/buyers/${buyerId}/profile`, {
    method: 'PUT',
    body: input,
    accessToken,
    idempotencyKey,
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
  idempotencyKey: string,
): Promise<{ approved: boolean }> {
  return apiFetch(`/staff/registrations/${id}/approve`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

// Staff-assisted enquiries — new, not in the original API_CONTRACT.md.
/** Phase 3 — the staff "Register a buyer" form, validated for real; no OTP (DEC-056). */
export function staffRegisterBuyer(
  accessToken: string,
  input: {
    mobile: string;
    firm: string;
    gstin?: string;
    pan?: string;
    ownerName?: string;
    category: BuyerCategory;
    location: BuyerLocationInput;
    dealerships?: Array<{ manufacturerId: string }>;
    licenceNo?: string;
    margPartyCode?: string;
    /** null = the Queue; left out = the person registering. */
    assignedToEmployeeId?: string | null;
    bankDetail?: { accountNumber: string; ifsc: string; accountName: string };
    consent: { noticeVersion: string; marketingOptIn: boolean };
    callNote?: string;
    proprietorAgreed: true;
    confirmations?: BuyerConfirmations;
  },
  idempotencyKey: string,
): Promise<{ registrationId: string; accountNameWarning: string | null; loginMobile: boolean }> {
  return apiFetch('/staff/registrations/buyer', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
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
    dealerships?: Array<{ manufacturerId: string }>;
    bankDetail: { accountNumber: string; ifsc: string; accountName: string };
    consent: { noticeVersion: string; marketingOptIn: boolean };
    callNote: string;
  },
): Promise<{ registrationId: string; accountNameWarning: string | null }> {
  return apiFetch('/staff/registrations/seller', { method: 'POST', body: input, accessToken });
}

// API-015
export function rejectRegistration(
  accessToken: string,
  id: string,
  reason: string,
  idempotencyKey: string,
): Promise<{ rejected: boolean }> {
  return apiFetch(`/staff/registrations/${id}/reject`, {
    method: 'POST',
    body: { reason },
    accessToken,
    idempotencyKey,
  });
}
