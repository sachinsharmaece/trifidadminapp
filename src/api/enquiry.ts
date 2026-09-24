import { apiFetch } from './client';
import type { ChainViewDto } from './dto';

/**
 * Enquiry journey — `enquiry` (ENT-62, DEC-051/052). Copied from
 * trifid-serverapp's modules/enquiry. Trade actions on an enquiry (quotes,
 * piles, promotions) still go through api/proxy.ts; this file covers the
 * enquiry record itself: list, open, create, convert, drop, owner,
 * follow-up and notes.
 *
 * Each desk receives only its own side, so every side-specific field below is
 * optional: Sales gets `buyer`/`prospect` and buyer-facing rates, Purchase gets
 * `seller` and seller rates, Logistics gets neither, the full view (Accounts,
 * Controller, Founder, Admin) gets both.
 */
export type EnquiryKind = 'pre_trade' | 'ask' | 'pile_request';
export type EnquiryChannel = 'self' | 'sales_call';
// Whose lead a pre-trade enquiry is. Always `buyer` for `ask`/`pile_request`.
export type EnquiryPartyKind = 'buyer' | 'seller';

export type EnquiryStatus =
  | 'pre_trade'
  | 'head_start'
  | 'awaiting_quotes'
  | 'awaiting_seller'
  | 'quotes_received'
  | 'requoted'
  | 'confirming'
  | 'shortfall'
  | 'ordered'
  | 'declined'
  | 'withdrawn'
  | 'lapsed'
  | 'dropped'
  | 'listed'; // Pre-trade, seller party — Purchase made him a listing separately.

export type TradeStatus = 'in_trade' | 'completed' | 'cancelled';
export type EnquiryPhase = 'raised' | 'responded' | 'ordered' | 'closed';
export type EnquiryOutcome = 'open' | 'won' | 'lost';
export type WaitingOn = 'buyer' | 'seller' | 'desk' | 'system' | null;
export type WorkDesk = 'sales' | 'purchase';

export const DROP_REASONS = [
  'buyer_not_registrable',
  'product_not_stocked',
  'buyer_lost_interest',
  'duplicate',
  'other',
] as const;
export type DropReason = (typeof DROP_REASONS)[number];

export type EnquiryAction =
  | 'accept_fill'
  | 'walk_away'
  | 'promotion_decision'
  | 'confirm_pile'
  | 'requote_pile'
  | 'decline_pile'
  | 'convert_to_ask'
  | 'mark_listed'
  | 'drop'
  | 'edit'
  | 'manage';

export interface EnquiryParty {
  id: string;
  counterpartyId: string;
  firm: string | null;
}

export interface EnquiryProspect {
  firm: string;
  contactName: string | null;
  mobile: string | null;
  place: string | null;
}

export interface EnquiryProduct {
  productId: string;
  brand: string;
  packLabel: string | null;
}

export interface EnquiryOwner {
  employeeId: string;
  name: string;
}

export interface EnquiryListItem {
  id: string;
  enquiryNo: string;
  kind: EnquiryKind;
  party: EnquiryPartyKind;
  channel: EnquiryChannel;
  raisedAt: string;
  qty: number;
  product: EnquiryProduct | null;
  productText: string | null;
  status: EnquiryStatus;
  phase: EnquiryPhase;
  outcome: EnquiryOutcome;
  waitingOn: WaitingOn;
  statusChangedAt: string;
  tradeStatus?: TradeStatus;
  tradeWaitingOn?: 'buyer' | 'chain' | null;
  orderCount: number;
  quoteCount?: number;
  owners: { sales: EnquiryOwner | null; purchase: EnquiryOwner | null };
  followUp?: { sales?: string | null; purchase?: string | null };
  buyer?: EnquiryParty | null;
  prospect?: EnquiryProspect | null;
  seller?: EnquiryParty | null;
}

export interface EnquiryQuote {
  quoteId: string;
  qtyAvailable: number;
  daysToIndore: number;
  status: 'live' | 'won' | 'lost' | 'expired' | 'promoted' | 'withdrawn';
  gapCodes: string[];
  expiryBand?: string;
  deliveryBand?: string;
  expiryExact?: string;
  provenance?: string;
  bindingUntil?: string;
  rank?: number;
  ofCount?: number;
  buyerRatePaise?: number | null;
  ratePaiseForIndore?: number;
  seller?: EnquiryParty | null;
}

export interface EnquiryPile {
  pileId: string;
  decision: 'confirmed' | 'requoted' | 'declined' | null;
  decidedAt: string | null;
  confirmWindowEndsAt: string;
  askedQty: number;
  confirmedQty: number | null;
  shortfall: boolean;
  executedAt: string | null;
  sellerLockedUntil: string | null;
  requestCount: number;
  requests: Array<{ index: number; boxes: number; time: string; isThis: boolean }>;
}

export interface EnquiryLine {
  lineId: string;
  expiryBand: string;
  deliveryBand: string;
  provenance: 'company' | 'auth';
  moqExact: number;
  ratePaise?: number;
  qtyLeft?: number;
  buyerRatePaise?: number | null;
}

export interface EnquiryChain {
  chainId: string;
  soId?: string;
  source: 'listed' | 'inquiry';
  view: ChainViewDto;
}

export interface EnquiryTimelineEntry {
  at: string;
  source: 'enquiry' | 'chain';
  type: string;
  qty?: number;
  chainNo?: string;
  callNote?: string;
}

export interface EnquiryNote {
  desk: 'sales' | 'purchase' | 'full';
  author: string;
  text: string;
  at: string;
}

export interface EnquiryDetail extends EnquiryListItem {
  raisedBy: string | null;
  requirement: { expiryBand: string | null; deliveryBand: string | null } | null;
  dropReason: DropReason | null;
  closedAt: string | null;
  askId?: string;
  allPacks?: boolean;
  visibleToAllAt?: string;
  holdExpiresAt?: string | null;
  ttlAt?: string;
  quotes?: EnquiryQuote[];
  pileRequestId?: string;
  pile?: EnquiryPile;
  line?: EnquiryLine;
  chains: EnquiryChain[];
  timeline: EnquiryTimelineEntry[];
  notes?: EnquiryNote[];
  actions: EnquiryAction[];
}

export interface EnquiryFilters {
  kind?: EnquiryKind;
  outcome?: EnquiryOutcome;
  mine?: boolean;
  followUpDue?: boolean;
  q?: string;
  limit?: number;
}

export function listEnquiries(
  accessToken: string,
  filters: EnquiryFilters = {},
): Promise<EnquiryListItem[]> {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.mine) params.set('mine', 'true');
  if (filters.followUpDue) params.set('followUpDue', 'true');
  if (filters.q) params.set('q', filters.q);
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString();
  return apiFetch(`/staff/enquiries${query ? `?${query}` : ''}`, { accessToken });
}

export function getEnquiry(accessToken: string, id: string): Promise<EnquiryDetail> {
  return apiFetch(`/staff/enquiries/${id}`, { accessToken });
}

type ConditionRequirement = { expiryBand: 'over12' | 'under12'; deliveryBand?: '48h' | '2-5d' };

export interface CreateEnquiryInput {
  party?: EnquiryPartyKind; // Default `buyer`.
  buyerCounterpartyId?: string;
  sellerCounterpartyId?: string;
  prospect?: { firm: string; contactName?: string; mobile?: string; place?: string };
  skuId?: string;
  productText?: string;
  qty: number;
  conditionRequirement?: ConditionRequirement;
  callNote: string;
}

// API-212 — a registered buyer + catalogue pack raises an ask; anything else
// (any seller party included) is pre-trade.
export function createEnquiry(
  accessToken: string,
  input: CreateEnquiryInput,
): Promise<{ enquiryId: string; enquiryNo: string; askId?: string }> {
  return apiFetch('/staff/enquiries', { method: 'POST', body: input, accessToken });
}

export interface EditEnquiryInput {
  qty?: number;
  conditionRequirement?: ConditionRequirement;
  prospect?: { firm: string; contactName?: string; mobile?: string; place?: string };
  productText?: string;
  callNote: string;
}

// API-219 — DEC-052. Pre-trade only: the still-draft fields (qty, requirement,
// and whichever of prospect/productText this enquiry has). Identity — the
// buyer/prospect, the catalogue pack — changes by converting, not editing.
export function editEnquiry(
  accessToken: string,
  id: string,
  input: EditEnquiryInput,
): Promise<{ edited: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/edit`, { method: 'POST', body: input, accessToken });
}

// API-213 — DEC-052.
export function convertEnquiry(
  accessToken: string,
  id: string,
  input: {
    buyerCounterpartyId: string;
    skuId: string;
    qty?: number;
    conditionRequirement: ConditionRequirement;
    callNote: string;
  },
): Promise<{ enquiryId: string; askId: string }> {
  return apiFetch(`/staff/enquiries/${id}/convert`, { method: 'POST', body: input, accessToken });
}

// API-214 — DEC-052.
export function dropEnquiry(
  accessToken: string,
  id: string,
  input: { reason: DropReason; callNote: string },
): Promise<{ dropped: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/drop`, { method: 'POST', body: input, accessToken });
}

// API-220 — DEC-052. Seller party only: Purchase made him a listing separately.
export function markEnquiryListed(
  accessToken: string,
  id: string,
  input: { callNote: string },
): Promise<{ listed: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/mark-listed`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-215.
export function setEnquiryOwner(
  accessToken: string,
  id: string,
  input: { desk?: WorkDesk; employeeId: string | null },
): Promise<{ updated: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/owner`, { method: 'POST', body: input, accessToken });
}

// API-216.
export function setEnquiryFollowUp(
  accessToken: string,
  id: string,
  input: { desk?: WorkDesk; at: string | null },
): Promise<{ updated: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/follow-up`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-217.
export function addEnquiryNote(
  accessToken: string,
  id: string,
  text: string,
): Promise<{ added: boolean }> {
  return apiFetch(`/staff/enquiries/${id}/notes`, {
    method: 'POST',
    body: { text },
    accessToken,
  });
}

// API-218.
export function listEnquiryAssignees(
  accessToken: string,
  desk: WorkDesk,
): Promise<Array<{ employeeId: string; name: string }>> {
  return apiFetch(`/staff/enquiries/assignees?desk=${desk}`, { accessToken });
}
