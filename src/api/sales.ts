import { apiFetch } from './client';

export interface SalesWorkItem {
  bucket: 'money' | 'promised' | 'he_asked' | 'market';
  refType: 'so' | 'po' | 'ask' | 'quote';
  refId: string;
  buyerId?: string;
  dueAt?: string;
}

export function getSalesWorklist(accessToken: string): Promise<SalesWorkItem[]> {
  return apiFetch('/staff/sales/worklist', { accessToken });
}

export interface PulseCell {
  areaTehsilId: string;
  productId: string;
  status: 'rising' | 'falling' | 'steady';
  now: number;
  before: number;
}

export function getMarketPulse(accessToken: string): Promise<PulseCell[]> {
  return apiFetch('/staff/sales/pulse', { accessToken });
}

export interface RetentionCohort {
  month: string;
  firstOrderCount: number;
  retainedCount: number;
  retentionPct: number;
}

export function getRetention(accessToken: string): Promise<RetentionCohort[]> {
  return apiFetch('/staff/sales/retention', { accessToken });
}

// Corrected M7 (QR-048/BR-206) — Controller decides disputes, not an
// execution desk directly; `'unhandled'` is `transit_damage` (QR-050).
export interface ComplaintQueueItem {
  complaintId: string;
  soId: string;
  category: string;
  destination: 'controller' | 'unhandled';
  state: string;
  createdAt: string;
  disposition: string | null;
  resolutionNote: string | null;
}

export function getComplaintQueue(accessToken: string): Promise<ComplaintQueueItem[]> {
  return apiFetch('/staff/sales/complaints', { accessToken });
}

export interface MspQueueItem {
  mspRequestId: string;
  buyerId: string;
  skuId: string;
  qty: number;
  status: string;
}

export function getMspQueue(accessToken: string): Promise<MspQueueItem[]> {
  return apiFetch('/staff/sales/msp', { accessToken });
}

export function respondToMsp(
  accessToken: string,
  mspRequestId: string,
  decision: { granted: boolean; refusalCode?: string },
): Promise<{ done: boolean }> {
  return apiFetch(`/staff/sales/msp/${mspRequestId}/respond`, {
    method: 'POST',
    body: decision,
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — calls.
// ---------------------------------------------------------------------------

export type CallOutcome =
  | 'placed_an_order'
  | 'asked_for_a_rate'
  | 'wants_something_we_dont_stock'
  | 'rate_too_high'
  | 'already_holds_stock'
  | 'buys_direct_from_company'
  | 'not_now_call_later'
  | 'no_answer'
  | 'wrong_number';

export type CallLogKind = 'call' | 'note' | 'update_request';

export type CallLogUpdateKind =
  'mobile' | 'delivery_address' | 'dealerships' | 'reclassify_request' | 'gst_details';

export interface CallLogDto {
  callLogId: string;
  buyerId: string;
  employeeId: string;
  employeeName: string;
  direction: 'in' | 'out' | null;
  at: string;
  kind: CallLogKind;
  outcome: CallOutcome | null;
  note: string;
  producedAskId: string | null;
  listingLineId: string | null;
  updateKind: CallLogUpdateKind | null;
  updateValue: string | null;
  promiseDueAt: string | null;
  promiseFulfilledAt: string | null;
}

export interface CreateCallLogInput {
  buyerId: string;
  direction?: 'in' | 'out' | null;
  kind: CallLogKind;
  outcome?: CallOutcome;
  note: string;
  producedAskId?: string;
  listingLineId?: string;
  updateKind?: CallLogUpdateKind;
  updateValue?: string;
  promiseDueAt?: string;
}

export function createCallLog(accessToken: string, input: CreateCallLogInput): Promise<CallLogDto> {
  return apiFetch('/staff/sales/calls', { method: 'POST', body: input, accessToken });
}

export function listCallLogsForBuyer(accessToken: string, buyerId: string): Promise<CallLogDto[]> {
  return apiFetch(`/staff/sales/calls?buyerId=${encodeURIComponent(buyerId)}`, { accessToken });
}

export function getSalesPromises(accessToken: string): Promise<CallLogDto[]> {
  return apiFetch('/staff/sales/promises', { accessToken });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — board (rate ladder).
// ---------------------------------------------------------------------------

export interface BoardProductRow {
  productId: string;
  brand: string;
  technicalName: string;
  manufacturerName: string;
  ladderCount: number;
  cheapestRatePaise: number | null;
  buyerCount: number;
}

export function getSalesBoard(accessToken: string): Promise<BoardProductRow[]> {
  return apiFetch('/staff/sales/board', { accessToken });
}

export interface BoardLadderLine {
  listingLineId: string;
  skuId: string;
  packLabel: string;
  ratePaise: number | null;
  qty: number;
  expiryBand: string;
  moqBand: string;
  deliveryBand: string;
  provenance: string;
  tehsilCount: number;
}

export interface BoardOpenAsk {
  askId: string;
  buyerId: string;
  buyerFirm: string;
  skuId: string | null;
  qty: number;
  state: string;
  createdAt: string;
}

export interface BuyerProductHistoryEntry {
  soId: string;
  soNo: string;
  state: string;
  totalPaise: number;
  createdAt: string;
}

export interface BoardProductDetail {
  productId: string;
  brand: string;
  technicalName: string;
  manufacturerName: string;
  ladder: BoardLadderLine[];
  openAsks: BoardOpenAsk[];
  buyerHistory?: BuyerProductHistoryEntry[];
}

export function getSalesBoardProduct(
  accessToken: string,
  productId: string,
  filters?: { tier?: 'Distributor' | 'Dealer' | 'Retailer' | 'Trader'; buyerId?: string },
): Promise<BoardProductDetail> {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
  if (filters?.buyerId) params.set('buyerId', filters.buyerId);
  const qs = params.toString();
  return apiFetch(`/staff/sales/board/${productId}${qs ? `?${qs}` : ''}`, { accessToken });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — pools.
// ---------------------------------------------------------------------------

export interface PoolCommitmentRow {
  poolCommitmentId: string;
  buyerId: string;
  buyerFirm: string;
  ownerName: string | null;
  qty: number;
  isBinding: boolean;
  reconfirmedAt: string | null;
  paidAt: string | null;
  withdrawnAt: string | null;
}

export interface PoolRow {
  poolId: string;
  skuId: string;
  brand: string;
  packLabel: string;
  conditionSetKey: string;
  expiryBand: string;
  moqBand: string;
  deliveryBand: string;
  provenance: string;
  moq: number;
  status: string;
  isActive: boolean;
  triggeredAt: string | null;
  payDeadline: string | null;
  committedQty: number;
  bindingQty: number;
  commitments: PoolCommitmentRow[];
}

export function getSalesPools(accessToken: string): Promise<PoolRow[]> {
  return apiFetch('/staff/sales/pools', { accessToken });
}

export function getSalesPool(accessToken: string, poolId: string): Promise<PoolRow> {
  return apiFetch(`/staff/sales/pools/${poolId}`, { accessToken });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — buyers.
// ---------------------------------------------------------------------------

export interface BuyerListRow {
  buyerId: string;
  firm: string;
  gstin: string | null;
  tehsil: string | null;
  tier: string | null;
  orderCount: number;
  lastOrderAt: string | null;
  rateViews: number;
  ownerName: string | null;
}

export function listSalesBuyers(
  accessToken: string,
  filters?: { q?: string; tab?: 'book' | 'queue' },
): Promise<BuyerListRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set('q', filters.q);
  if (filters?.tab) params.set('tab', filters.tab);
  const qs = params.toString();
  return apiFetch(`/staff/sales/buyers${qs ? `?${qs}` : ''}`, { accessToken });
}

export interface BuyerProductHistoryRow {
  productId: string;
  brand: string;
  orderCount: number;
  lastPaidRatePaise: number | null;
}

export interface BuyerFileOpenAsk {
  askId: string;
  productId: string | null;
  skuId: string | null;
  qty: number;
  state: string;
}

// BR-030/031 — the coarse 7-step chain-strip position; `state` above is the
// finer per-SO state.
export type ChainStage = 'so' | 'payment' | 'po' | 'leg1' | 'marg' | 'dispatch' | 'done';

export interface SalesOrderRow {
  soId: string;
  soNo: string;
  // B-56 — the one remaining reachable source for the Chain ID the "Record
  // a dispatch" screen requires, now that the Chain Desk/Enquiry detail
  // screens are unrouted.
  chainId: string;
  buyerId: string;
  buyerCounterpartyId: string;
  buyerFirm: string;
  productDisplay: string;
  totalPaise: number;
  state: string;
  chainStage: ChainStage;
  payDeadline: string;
  claimNeedsApplying: boolean;
  upcomingReceiptId: string | null;
  claimedAt: string | null;
  claimedAmountPaise: number | null;
}

export interface BuyerFileDto {
  buyerId: string;
  counterpartyId: string;
  firm: string;
  gstin: string | null;
  mobile: string;
  tehsil: string | null;
  tier: string | null;
  classified: boolean;
  rateViews: number;
  ownerName: string | null;
  productHistory: BuyerProductHistoryRow[];
  openAsks: BuyerFileOpenAsk[];
  callLogs: CallLogDto[];
  orders: SalesOrderRow[];
}

export function getSalesBuyerFile(accessToken: string, buyerId: string): Promise<BuyerFileDto> {
  return apiFetch(`/staff/sales/buyers/${buyerId}`, { accessToken });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — orders.
// ---------------------------------------------------------------------------

export function listSalesOrders(
  accessToken: string,
  filters?: { tab?: 'live' | 'closed' },
): Promise<SalesOrderRow[]> {
  const params = new URLSearchParams();
  if (filters?.tab) params.set('tab', filters.tab);
  const qs = params.toString();
  return apiFetch(`/staff/sales/orders${qs ? `?${qs}` : ''}`, { accessToken });
}

// ---------------------------------------------------------------------------
// Sales desk v2 — funnel.
// ---------------------------------------------------------------------------

export type SalesFunnelUnit = 'count' | 'percent' | 'hours';

export interface SalesFunnelMetric {
  key:
    | 'registered'
    | 'classified'
    | 'viewing'
    | 'asked'
    | 'rate_held'
    | 'took_it'
    | 'paid'
    | 'delivered'
    | 'ordered_again';
  label: string;
  formula: string;
  unit: SalesFunnelUnit;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  caveat: string | null;
  leakCount?: number | null;
}

export interface SalesFunnelReport {
  windowDays: number;
  from: string;
  to: string;
  metrics: SalesFunnelMetric[];
}

export function getSalesFunnel(accessToken: string): Promise<SalesFunnelReport> {
  return apiFetch('/staff/sales/funnel', { accessToken });
}
