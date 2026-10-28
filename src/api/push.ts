import { apiFetch } from './client';

/**
 * Phase 6 — Push to Purchase. Sales pushes a buyer who can also supply; the
 * receiving Purchase executive completes him on the first call; a Purchase
 * Leader approves or rejects. Purchase never reads the buyer's trade, Sales
 * never the seller's.
 */
export interface PushStatusDto {
  canPush: boolean;
  blockedReason: string | null;
  alreadySeller: { sellerId: string; firm: string } | null;
  openPush: { pushId: string; status: string; receiver: string | null } | null;
  receiver: { employeeId: string; person: string } | null;
  canChooseReceiver: boolean;
}

export type PushStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export function getPushStatus(accessToken: string, buyerId: string): Promise<PushStatusDto> {
  return apiFetch(`/staff/buyers/${buyerId}/push`, { accessToken });
}

export function pushToPurchase(
  accessToken: string,
  buyerId: string,
  input: { note: string; receiverEmployeeId?: string },
  idempotencyKey: string,
): Promise<{ pushId: string; receiver: { employeeId: string; person: string } }> {
  return apiFetch(`/staff/buyers/${buyerId}/push`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export interface SalesPushRow {
  pushId: string;
  buyerId: string;
  firm: string;
  pushedAt: string;
  pushedBy: string | null;
  purchaseExecutive: string | null;
  status: PushStatus;
  rejectionReason: string | null;
}

export function listSalesPushes(accessToken: string): Promise<SalesPushRow[]> {
  return apiFetch('/staff/sales/pushes', { accessToken });
}

export interface PurchasePushRow {
  pushId: string;
  firm: string;
  pushedBy: string | null;
  note: string;
  pushedAt: string;
  receiver: string | null;
  status: PushStatus;
}

export function listPurchasePushes(
  accessToken: string,
  status: 'open' | PushStatus = 'open',
): Promise<PurchasePushRow[]> {
  return apiFetch(`/staff/purchase/pushes?status=${status}`, { accessToken });
}

export interface PushLocation {
  address: string;
  pincode: string | null;
  stateId: string;
  districtId: string;
  tehsilId: string;
}

export interface PushReference {
  firm: string;
  phone: string;
  relationship: string;
  whatTheySaid: string;
}

export interface PushDetailDto {
  pushId: string;
  status: PushStatus;
  firm: string;
  ownerName: string | null;
  contactMobile: string | null;
  gstin: string | null;
  pan: string | null;
  licenceNo: string | null;
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
  pushedBy: string | null;
  pushedAt: string;
  note: string;
  receiver: { employeeId: string; person: string | null };
  draft: {
    gstin: string | null;
    licenceNo: string | null;
    location: PushLocation | null;
    references: PushReference[];
    dealershipIds: string[];
    margPartyCode: string | null;
    callNote: string | null;
    bankDetailGiven: boolean;
  } | null;
  /** 28 Oct — the companies ticked on his buyer profile (names only); Complete starts with them ticked. */
  buyerCompanies: Array<{ manufacturerId: string; name: string }>;
  firmHasBankDetail: boolean;
  needsGstin: boolean;
  canComplete: boolean;
  canDecide: boolean;
  rejectionReason: string | null;
  sellerId: string | null;
}

export function getPush(accessToken: string, pushId: string): Promise<PushDetailDto> {
  return apiFetch(`/staff/purchase/pushes/${pushId}`, { accessToken });
}

export interface CompletePushInput {
  gstin?: string;
  licenceNo: string;
  location: {
    address: string;
    pincode?: string;
    stateId: string;
    districtId: string;
    tehsilId: string;
  };
  references: PushReference[];
  dealerships?: Array<{ manufacturerId: string }>;
  bankDetail?: { accountNumber: string; ifsc: string; accountName: string };
  margPartyCode?: string;
  callNote: string;
}

export function completePush(
  accessToken: string,
  pushId: string,
  input: CompletePushInput,
  idempotencyKey: string,
): Promise<PushDetailDto> {
  return apiFetch(`/staff/purchase/pushes/${pushId}/complete`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export interface ApprovePushInput {
  tehsilIds: string[];
  dispatchCutoffTime: string;
  assignedToEmployeeId: string;
}

export function approvePush(
  accessToken: string,
  pushId: string,
  input: ApprovePushInput,
  idempotencyKey: string,
): Promise<{ sellerId: string }> {
  return apiFetch(`/staff/purchase/pushes/${pushId}/approve`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export function rejectPush(
  accessToken: string,
  pushId: string,
  reason: string,
  idempotencyKey: string,
): Promise<{ rejected: true }> {
  return apiFetch(`/staff/purchase/pushes/${pushId}/reject`, {
    method: 'POST',
    body: { reason },
    accessToken,
    idempotencyKey,
  });
}
