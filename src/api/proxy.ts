import { apiFetch } from './client';

/**
 * Staff-assisted enquiries — a phone-call proxy layer. Every call here
 * mirrors the counterparty-facing endpoint it wraps exactly (same body
 * shape plus the counterparty being acted for and the mandatory call
 * note); the response is the same DTO shape the counterparty would get.
 */

function idempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// --- Buyer-side (Sales desk) --------------------------------------------

export interface ProxyRaiseAskInput {
  buyerCounterpartyId: string;
  skuId?: string;
  productId?: string;
  allPacks?: boolean;
  qty: number;
  conditionRequirement: { expiryBand: 'over12' | 'under12'; deliveryBand?: '48h' | '2-5d' };
  callNote: string;
}

export function proxyRaiseAsk(
  accessToken: string,
  input: ProxyRaiseAskInput,
): Promise<{ askId: string }> {
  return apiFetch('/staff/proxy/buyer/asks', { method: 'POST', body: input, accessToken });
}

export function proxyAcceptAskFill(
  accessToken: string,
  askId: string,
  input: {
    buyerCounterpartyId: string;
    option: 'partial' | 'full';
    quoteIds: string[];
    callNote: string;
  },
): Promise<{ soIds: string[] }> {
  return apiFetch(`/staff/proxy/buyer/asks/${askId}/accept`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

export function proxyDeclineAsk(
  accessToken: string,
  askId: string,
  input: { buyerCounterpartyId: string; callNote: string },
): Promise<{ declined: boolean }> {
  return apiFetch(`/staff/proxy/buyer/asks/${askId}/decline`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function proxyAcceptPromotion(
  accessToken: string,
  soId: string,
  input: { buyerCounterpartyId: string; callNote: string },
): Promise<{ accepted: boolean }> {
  return apiFetch(`/staff/proxy/buyer/orders/${soId}/promotion/accept`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

export function proxyRejectPromotion(
  accessToken: string,
  soId: string,
  input: { buyerCounterpartyId: string; callNote: string },
): Promise<{ rejected: boolean }> {
  return apiFetch(`/staff/proxy/buyer/orders/${soId}/promotion/reject`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// --- Seller-side (Purchase desk) ----------------------------------------

export interface ProxyCreateListingLineInput {
  skuId: string;
  ratePaise: number;
  expiryBand: 'over12' | 'under12';
  expiryExact?: string;
  moqExact?: number;
  deliveryBand: '48h' | '2-5d';
  provenance: 'company' | 'auth';
  batch?: string;
  qty: number;
}

export function proxyCreateListing(
  accessToken: string,
  input: {
    sellerCounterpartyId: string;
    productId: string;
    scopeType: 'my_area' | 'all_india' | 'all_except_mine' | 'custom';
    customTehsilIds?: string[];
    lines: ProxyCreateListingLineInput[];
    callNote: string;
  },
): Promise<{ listingId: string; lineIds: string[] }> {
  return apiFetch('/staff/proxy/seller/listings', { method: 'POST', body: input, accessToken });
}

export function proxyConfirmPile(
  accessToken: string,
  pileId: string,
  input: {
    sellerCounterpartyId: string;
    canSendBoxes: number;
    expiryExact: string;
    batch?: string;
    callNote: string;
  },
): Promise<{ pileId: string; undoWindowMs: number }> {
  return apiFetch(`/staff/proxy/seller/confirmations/${pileId}/confirm`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

export function proxyRequotePile(
  accessToken: string,
  pileId: string,
  input: { sellerCounterpartyId: string; callNote: string },
): Promise<{ requoted: boolean }> {
  return apiFetch(`/staff/proxy/seller/confirmations/${pileId}/requote`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function proxyDeclinePile(
  accessToken: string,
  pileId: string,
  input: { sellerCounterpartyId: string; callNote: string },
): Promise<{ declined: boolean }> {
  return apiFetch(`/staff/proxy/seller/confirmations/${pileId}/decline`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
