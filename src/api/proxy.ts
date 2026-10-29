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
  /** 28 Oct — Incoming/Outgoing, for the call history. */
  direction?: 'in' | 'out';
}

export function proxyRaiseAsk(
  accessToken: string,
  input: ProxyRaiseAskInput,
): Promise<{ askId: string }> {
  return apiFetch('/staff/proxy/buyer/asks', { method: 'POST', body: input, accessToken });
}

export type ProxyRaiseAskLine = Omit<
  ProxyRaiseAskInput,
  'buyerCounterpartyId' | 'callNote' | 'direction'
> & {
  /** What he said he hopes to pay, in paise — kept for Sales only. */
  expectedRatePaise?: number;
};

/**
 * 29 Oct — "He wants it" on a listed offer: a pile request on it (Purchase → Confirmations), or
 * the pool for it when he wants fewer than its minimum order.
 */
export type ProxyWantsItResult =
  | { kind: 'pile'; pileId: string; listingLineId: string }
  | { kind: 'pool'; poolId: string; listingLineId: string };

export function proxyWantsIt(
  accessToken: string,
  listingLineId: string,
  input: {
    buyerCounterpartyId: string;
    qty: number;
    callNote: string;
    direction?: 'in' | 'out';
  },
): Promise<ProxyWantsItResult> {
  return apiFetch(`/staff/proxy/buyer/listing-lines/${listingLineId}/wants-it`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

/**
 * One entry per submitted line, by position. 29 Oct — a product on his board goes on the
 * cheapest offer (`pile` / `pool`, Purchase → Confirmations); one that is not becomes an
 * `ask` (Purchase → Demand); or an error if the line was refused.
 */
export type ProxyRaiseAsksLineResult =
  | { index: number; kind: 'ask'; askId: string }
  | ({ index: number } & ProxyWantsItResult)
  | { index: number; error: string; code: string | null };

/** One call naming several products, all under the same call note. */
export function proxyRaiseAsks(
  accessToken: string,
  input: {
    buyerCounterpartyId: string;
    callNote: string;
    lines: ProxyRaiseAskLine[];
    direction?: 'in' | 'out';
  },
): Promise<{ results: ProxyRaiseAsksLineResult[] }> {
  return apiFetch('/staff/proxy/buyer/asks/batch', { method: 'POST', body: input, accessToken });
}

export interface ProxyAskQuote {
  quoteId: string;
  ratePaiseForIndore: number | undefined;
  qtyAvailable: number;
  conditionSet: unknown;
  daysToIndore: number;
  status: string;
}

export interface ProxyAskItem {
  askId: string;
  qty: number;
  state: string;
  ttlAt: string;
  holdExpiresAt: string | null;
  quotes: ProxyAskQuote[];
}

/** Feeds the ask/quote pickers on "Advance an ask on a call" — same read the buyer's own GET /asks calls. */
export function proxyListBuyerAsks(
  accessToken: string,
  buyerCounterpartyId: string,
): Promise<ProxyAskItem[]> {
  return apiFetch(
    `/staff/proxy/buyer/asks?buyerCounterpartyId=${encodeURIComponent(buyerCounterpartyId)}`,
    { accessToken },
  );
}

export function proxyAcceptAskFill(
  accessToken: string,
  askId: string,
  input: {
    buyerCounterpartyId: string;
    option: 'partial' | 'full';
    quoteIds: string[];
    callNote: string;
    direction?: 'in' | 'out';
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
  input: { buyerCounterpartyId: string; callNote: string; direction?: 'in' | 'out' },
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
  input: { buyerCounterpartyId: string; callNote: string; direction?: 'in' | 'out' },
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
  input: { buyerCounterpartyId: string; callNote: string; direction?: 'in' | 'out' },
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

export interface ProxyPostQuoteInput {
  sellerCounterpartyId: string;
  ratePaiseForIndore: number;
  qtyAvailable: number;
  expiryBand: 'over12' | 'under12';
  expiryExact: string;
  deliveryBand: '48h' | '2-5d';
  provenance: 'company' | 'auth';
  batch?: string;
  daysToIndore: number;
  /** Needed only when the ask names a product, not one pack. */
  skuId?: string;
  callNote: string;
}

/** Purchase raises a quote on a seller's behalf from the Demand screen. */
export function proxyPostQuote(
  accessToken: string,
  askId: string,
  input: ProxyPostQuoteInput,
): Promise<{ quoteId: string }> {
  return apiFetch(`/staff/proxy/seller/asks/${askId}/quotes`, {
    method: 'POST',
    body: input,
    accessToken,
  });
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
