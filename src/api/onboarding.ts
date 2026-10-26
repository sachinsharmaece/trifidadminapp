import { apiFetch, apiFetchPage } from './client';
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

/** 26 Oct — the Registrations desk: one page at a time, searchable (firm, GSTIN, PAN, mobile). */
export function listRegistrationsPage(
  accessToken: string,
  filter: { stage?: string; q?: string; cursor?: string; limit?: number },
): Promise<{ items: RegistrationListItem[]; nextCursor?: string }> {
  const params = new URLSearchParams();
  if (filter.stage) params.set('stage', filter.stage);
  if (filter.q) params.set('q', filter.q);
  if (filter.cursor) params.set('cursor', filter.cursor);
  params.set('limit', String(filter.limit ?? 25));
  return apiFetchPage(`/staff/registrations?${params.toString()}`, { accessToken });
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
    // Phase 4 — his own location (needed if he came without one) and Assigned to (required).
    location?: BuyerLocationInput;
    assignedToEmployeeId: string;
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
    // Phase 4 — his own location, Marg code, who he is assigned to (null =
    // Queue; left out = the person adding him), and the proprietor tick.
    location: BuyerLocationInput;
    margPartyCode?: string;
    assignedToEmployeeId?: string | null;
    proprietorAgreed: true;
  },
  idempotencyKey: string,
): Promise<{ registrationId: string; accountNameWarning: string | null }> {
  return apiFetch('/staff/registrations/seller', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export interface SellerProfileDto {
  sellerId: string;
  counterpartyId: string;
  status: string;
  firm: string;
  ownerName: string | null;
  gstin: string | null;
  pan: string | null;
  loginMobile: string | null;
  contactMobile: string | null;
  licenceNo: string | null;
  margPartyCode: string | null;
  location: {
    address: string | null;
    pincode: string | null;
    stateId: string | null;
    districtId: string | null;
    tehsilId: string | null;
    tehsil: string | null;
    district: string | null;
    state: string | null;
  };
  assignedTo: { employeeId: string; person: string } | null;
  assignedLeader: { employeeId: string; person: string } | null;
  canEdit: boolean;
  canEditIdentity: boolean;
  /** Phase 5 — his leader (his team and the Queue) or Admin may move him. */
  canChangeOwner: boolean;
}

export function getRegistrationSellerProfile(
  accessToken: string,
  registrationId: string,
): Promise<SellerProfileDto> {
  return apiFetch(`/staff/registrations/${registrationId}/seller-profile`, { accessToken });
}

export function getSellerProfile(accessToken: string, sellerId: string): Promise<SellerProfileDto> {
  return apiFetch(`/staff/sellers/${sellerId}/profile`, { accessToken });
}

export function updateSellerProfile(
  accessToken: string,
  sellerId: string,
  input: {
    firm: string;
    ownerName: string;
    contactMobile: string;
    gstin: string;
    licenceNo: string;
    location: BuyerLocationInput;
    margPartyCode?: string;
  },
  idempotencyKey: string,
): Promise<SellerProfileDto> {
  return apiFetch(`/staff/sellers/${sellerId}/profile`, {
    method: 'PUT',
    body: input,
    accessToken,
    idempotencyKey,
  });
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
