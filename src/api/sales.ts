import type { AssignableSalesPerson } from './dto';
import { apiFetch, apiFetchPage } from './client';

export interface SalesWorkItem {
  bucket: 'money' | 'promised' | 'he_asked' | 'market';
  refType: 'so' | 'po' | 'ask' | 'quote';
  refId: string;
  buyerId?: string;
  dueAt?: string;
  productId?: string;
  productName?: string;
  buyerFirm?: string;
  tehsilName?: string;
  qty?: number;
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

/** One priced line that reaches a buyer's tehsil — his own tier rate, no seller identity. */
export interface BoardForBuyerLine {
  listingLineId: string;
  skuId: string;
  packLabel: string;
  ratePaise: number;
  qty: number;
  expiryBand: string;
  moqBand: string;
  deliveryBand: string;
  provenance: string;
}

export interface BoardForBuyerProduct {
  productId: string;
  brand: string;
  technicalName: string;
  manufacturerName: string;
  ladder: BoardForBuyerLine[];
}

/** "On the board for him" — everything that reaches his tehsil, never his order history (item 16). */
export function getSalesBoardForBuyer(
  accessToken: string,
  buyerId: string,
): Promise<BoardForBuyerProduct[]> {
  return apiFetch(`/staff/sales/buyers/${buyerId}/board`, { accessToken });
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
  /** Phase 3 — shown as "Unregistered · PAN" when there is no GSTIN. */
  pan: string | null;
  tehsil: string | null;
  district: string | null;
  /** The category: Retailer / Dealer / Distributor / Trader. */
  tier: string | null;
  /** null = the Queue. */
  assignedToEmployeeId: string | null;
  orderCount: number;
  lastOrderAt: string | null;
  rateViews: number;
  ownerName: string | null; // Sales employee whose book he is in.
  contactName: string | null; // The firm's own owner.
  mobile: string | null;
}

export function listSalesBuyers(
  accessToken: string,
  filters?: {
    q?: string;
    tab?: 'book' | 'queue';
    category?: string;
    districtId?: string;
    /** An employee id, or `queue`. */
    assignedTo?: string;
  },
): Promise<BuyerListRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set('q', filters.q);
  if (filters?.tab) params.set('tab', filters.tab);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.districtId) params.set('districtId', filters.districtId);
  if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
  const qs = params.toString();
  return apiFetch(`/staff/sales/buyers${qs ? `?${qs}` : ''}`, { accessToken });
}

/** 29 Oct — the filter options over a whole Buyers tab (not only the page loaded). */
export interface BuyerListFacets {
  districts: Array<{ districtId: string; name: string }>;
  assignees: Array<{ employeeId: string; person: string }>;
}

/** 29 Oct — Sales → Buyers a page at a time, searched and filtered on the server. */
export async function listSalesBuyersPage(
  accessToken: string,
  filters: {
    q?: string;
    tab?: 'book' | 'queue';
    category?: string;
    districtId?: string;
    assignedTo?: string;
    cursor?: string;
    limit?: number;
  },
): Promise<{
  items: BuyerListRow[];
  nextCursor?: string;
  total?: number;
  facets?: BuyerListFacets;
}> {
  const params = new URLSearchParams({ limit: String(filters.limit ?? 50) });
  for (const key of ['q', 'tab', 'category', 'districtId', 'assignedTo', 'cursor'] as const) {
    if (filters[key]) params.set(key, String(filters[key]));
  }
  const page = await apiFetchPage<BuyerListRow>(`/staff/sales/buyers?${params.toString()}`, {
    accessToken,
  });
  return { ...page, facets: page.meta?.facets as BuyerListFacets | undefined };
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
  brand: string;
  technical: string;
  packLabel: string | null;
  askedAt: string;
  /** What he said he hopes to pay, noted on the call — Sales-internal. */
  expectedRatePaise: number | null;
  /** Quotes already raised on this ask that Sales has not yet given him. */
  pendingQuotes: BuyerFileParkedQuote[];
}

/** A quote raised on his ask and waiting for Sales to give it to him; already on every buyer's board. */
export interface BuyerFileParkedQuote {
  quoteId: string;
  askId: string;
  /** The listing line this quote was published as — the same offer shows on his board. */
  listingLineId: string | null;
  packLabel: string | null;
  /** His own rate — seller net plus the margin for his tier. `null`: no margin set for him yet. */
  ratePaise: number | null;
  qtyAvailable: number;
  daysToIndore: number;
  expiryBand: string;
  expiryExact: string;
  deliveryBand: string;
  raisedAt: string;
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
  placedAt: string;
  updatedAt: string;
}

export interface BuyerFileLiveQuote {
  quoteId: string;
  askId: string;
  productId: string | null;
  brand: string;
  packLabel: string | null;
  /** His own rate — seller net plus the margin for his tier; what he is shown. */
  ratePaise: number | null;
  qtyAvailable: number;
  /** How many boxes he asked for. */
  askQty: number;
  daysToIndore: number;
  /** When the rate was given to him. */
  givenAt: string;
  bindingUntil: string;
}

/** 29 Oct — a listed offer he is on, waiting on the seller (a pile request, or a pool place). */
export interface BuyerFileWaitingOnSeller {
  kind: 'pile' | 'pool';
  id: string;
  productId: string | null;
  brand: string;
  packLabel: string | null;
  qty: number;
  /** His rate on the offer — pile only. */
  ratePaise: number | null;
  requestedAt: string;
  /** Pile only — when the seller's window to confirm ends. */
  decideBy: string | null;
  pool: { committedBoxes: number; moq: number; status: string } | null;
}

export interface BuyerFileOrdersByStage {
  paymentPending: SalesOrderRow[];
  paid: SalesOrderRow[];
  billed: SalesOrderRow[];
  dispatched: SalesOrderRow[];
  delivered: SalesOrderRow[];
  other: SalesOrderRow[];
}

export interface BuyerFunnelStage {
  key: SalesFunnelMetric['key'];
  label: string;
  reached: boolean;
  count: number | null;
  leakCount?: number;
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
  funnel: BuyerFunnelStage[];
  productHistory: BuyerProductHistoryRow[];
  openAsks: BuyerFileOpenAsk[];
  waitingOnSeller: BuyerFileWaitingOnSeller[];
  liveQuotes: BuyerFileLiveQuote[];
  callLogs: CallLogDto[];
  orders: SalesOrderRow[];
  ordersByStage: BuyerFileOrdersByStage;
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
    | 'billed'
    | 'dispatched'
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

// The records behind the Funnel's "Asked" and "Rate held" counts.
interface FunnelDrillRowBase {
  buyerId: string;
  buyerFirm: string;
  productId: string | null;
  brand: string;
  technical: string;
  packLabel: string | null;
  qty: number;
}

export interface FunnelAskRow extends FunnelDrillRowBase {
  askId: string;
  state: string;
  createdAt: string;
  pastSla: boolean;
}

export interface FunnelHeldRateRow extends FunnelDrillRowBase {
  quoteId: string;
  askId: string;
  ratePaise: number;
  daysToIndore: number;
  heldUntil: string;
}

export function getFunnelAsks(accessToken: string): Promise<FunnelAskRow[]> {
  return apiFetch('/staff/sales/funnel/asked', { accessToken });
}

export function getFunnelHeldRates(accessToken: string): Promise<FunnelHeldRateRow[]> {
  return apiFetch('/staff/sales/funnel/rate-held', { accessToken });
}

// ---------------------------------------------------------------------------
// Buyer file stage buttons — moving one enquiry to its next section by hand.
// Raise an ask / confirm a rate / walk away reuse api/proxy.ts; these three are Sales-only.
// ---------------------------------------------------------------------------

/** He asked → Rate given: give him one of the lines on his board as the rate. */
export function giveRateOnAsk(
  accessToken: string,
  askId: string,
  input: { listingLineId: string; callNote: string },
): Promise<{ quoteId: string }> {
  return apiFetch(`/staff/sales/asks/${askId}/give-rate`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Payment pending → Paid: record his UTR as the money in and release the PO. */
export function markOrderPaid(
  accessToken: string,
  soId: string,
  input: { utr: string; callNote: string },
): Promise<{ poId: string; poNo: string }> {
  return apiFetch(`/staff/sales/orders/${soId}/mark-paid`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

function stageKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Paid → Billed: key the Marg invoice. A `query` result means it did not match and nothing moved. */
export function markOrderBilled(
  accessToken: string,
  soId: string,
  input: {
    margInvoiceNo: string;
    date: string;
    valuePaise: number;
    ewayNo: string;
    callNote: string;
  },
): Promise<{ margBillId: string; state: 'matched' | 'query' }> {
  return apiFetch(`/staff/sales/orders/${soId}/mark-billed`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: stageKey(),
  });
}

/** INTERIM — Paid → Billed straight from PO released, recording leg 1 and the inspection for Logistics. */
export function skipOrderToBilled(
  accessToken: string,
  soId: string,
  input: {
    margInvoiceNo: string;
    date: string;
    valuePaise: number;
    ewayNo: string;
    legOneRef?: string;
    callNote: string;
  },
): Promise<{ margBillId: string; state: 'matched' | 'query' }> {
  return apiFetch(`/staff/sales/orders/${soId}/skip-to-billed`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: stageKey(),
  });
}

export interface DispatchOrderInput {
  mode: 'transport' | 'bus';
  transporter?: string;
  lr?: string;
  busNo?: string;
  driver?: string;
  driverMobile?: string;
  freightTerms: 'prepaid' | 'to_pay';
  freightAmountPaise: number;
  callNote: string;
}

/** Billed → Dispatch: leg 2 leaves Indore. */
export function dispatchOrder(
  accessToken: string,
  soId: string,
  input: DispatchOrderInput,
): Promise<{ movementId: string }> {
  return apiFetch(`/staff/sales/orders/${soId}/dispatch`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: stageKey(),
  });
}

/** Dispatch → Delivered: the buyer's confirmation of receipt, recorded on a call. */
export function markOrderDelivered(
  accessToken: string,
  soId: string,
  input: { callNote: string },
): Promise<{ closed: true }> {
  return apiFetch(`/staff/sales/orders/${soId}/mark-delivered`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: stageKey(),
  });
}

/** Payment pending → cancelled, before any money is posted. */
export function cancelUnpaidOrder(
  accessToken: string,
  soId: string,
  input: { callNote: string },
): Promise<{ cancelled: true }> {
  return apiFetch(`/staff/sales/orders/${soId}/cancel`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Phase 3 — who the caller may assign a buyer to (himself; his team; Admin: all Sales). */
export function getAssignableSalesPeople(accessToken: string): Promise<AssignableSalesPerson[]> {
  return apiFetch('/staff/sales/assignees', { accessToken });
}
