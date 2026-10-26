import { apiFetch } from './client';

export interface ActiveDemandItem {
  askId: string;
  qty: number;
  skuId: string | null;
  productId: string | null;
  createdAt: string;
  sellerCounts: { quoted: number; active: number; dormant: number; dark: number };
  noSeller: boolean;
  brand: string;
  technical: string;
  manufacturerName: string;
}

export function getActiveDemandList(
  accessToken: string,
  noSellerOnly?: boolean,
): Promise<ActiveDemandItem[]> {
  const query = noSellerOnly ? '?noSeller=true' : '';
  return apiFetch(`/staff/purchase/demand${query}`, { accessToken });
}

export interface AskQuoteGap {
  quoteId: string;
  sellerId: string;
  gapCodes: string[];
}

export function getQuoteGaps(accessToken: string, askId: string): Promise<AskQuoteGap[]> {
  return apiFetch(`/staff/purchase/asks/${askId}/quote-gaps`, { accessToken });
}

export interface AskSellerStateItem {
  sellerId: string;
  sellerCounterpartyId: string;
  firm: string;
  state: 'quoted' | 'listed' | 'carries';
  ratePaise: number | null;
  gapCodes: string[];
}

export function getAskSellerStates(
  accessToken: string,
  askId: string,
): Promise<AskSellerStateItem[]> {
  return apiFetch(`/staff/purchase/asks/${askId}/seller-states`, { accessToken });
}

export function postAskChase(
  accessToken: string,
  askId: string,
  sellerId: string,
): Promise<{ logged: true }> {
  return apiFetch(`/staff/purchase/asks/${askId}/chase`, {
    method: 'POST',
    body: { sellerId },
    accessToken,
  });
}

export interface CoverageCell {
  manufacturerId: string;
  tehsilId: string;
  sellerCount: number;
}

export function getCoverageMap(accessToken: string): Promise<CoverageCell[]> {
  return apiFetch('/staff/purchase/coverage-map', { accessToken });
}

export interface ProductAnalysis {
  productId: string;
  totalBoxesOrdered: number;
  positionSplit: Record<'Distributor' | 'Dealer' | 'Retailer' | 'Trader', number>;
  positionSplitSumsCorrectly: boolean;
  totalCasesInspected: number;
  rejectionSplit: { accepted: number; rejected: number };
  rejectionSplitSumsCorrectly: boolean;
}

export function getProductAnalysis(
  accessToken: string,
  productId: string,
): Promise<ProductAnalysis> {
  return apiFetch(`/staff/purchase/products/${productId}/analysis`, { accessToken });
}

export interface ProductSellerListedPack {
  packLabel: string;
  ratePaise: number;
  qty: number;
  expiryBand: string;
  deliveryBand: string;
  moqExact: number;
}

export interface ProductSellerItem {
  sellerId: string;
  firm: string;
  state: 'listed' | 'carries';
  listings: ProductSellerListedPack[];
}

export function getProductSellers(
  accessToken: string,
  productId: string,
): Promise<ProductSellerItem[]> {
  return apiFetch(`/staff/purchase/products/${productId}/sellers`, { accessToken });
}

// IC-06 — never the cap, never the two source rates.
export interface AbsorptionQueueItem {
  soId: string;
  status: string;
  deltaPaise: number;
  withinCap: boolean;
  offeredAt: string;
  expiresAt: string;
}

export function getAbsorptionQueue(accessToken: string): Promise<AbsorptionQueueItem[]> {
  return apiFetch('/staff/purchase/absorption', { accessToken });
}

export function postNonOrderReason(
  accessToken: string,
  input: { askId?: string; pileId?: string; code: string },
): Promise<{ nonOrderReasonId: string }> {
  return apiFetch('/staff/purchase/non-order-reasons', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export interface ReturnNoteAgeingItem {
  returnNoteId: string;
  poId: string;
  cases: number;
  daysOld: number;
  dueDate: string;
  overdue: boolean;
}

export function getReturnNoteAgeing(accessToken: string): Promise<ReturnNoteAgeingItem[]> {
  return apiFetch('/staff/purchase/return-notes/ageing', { accessToken });
}

// M7, BR-206 — the seller-recovery half of a Controller-decided dispute.
// Never the buyer, never the buyer's own note (see purchase.service.ts).
export interface SellerRecoveryItem {
  complaintId: string;
  sellerId: string;
  sellerFirm: string;
  debitNoteId: string | null;
  decidedAt: string | null;
}

export function getSellerRecoveryQueue(accessToken: string): Promise<SellerRecoveryItem[]> {
  return apiFetch('/staff/purchase/dispute-recovery', { accessToken });
}

// M8, BR-275 — funnel and leak analytics. Counts, hours and percentages only:
// no rupee figure and no buyer identity on any Purchase surface (BR-067/BR-069).
// Every metric carries its own plain-words formula, which the screen shows.
export interface FunnelMetric {
  key: string;
  label: string;
  formula: string;
  unit: 'count' | 'percent' | 'hours';
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  caveat: string | null;
}

export interface FunnelReport {
  windowDays: number;
  from: string;
  to: string;
  metrics: FunnelMetric[];
}

export function getFunnelReport(accessToken: string): Promise<FunnelReport> {
  return apiFetch('/staff/purchase/funnel', { accessToken });
}

// ---------------------------------------------------------------------------
// Purchase-desk v2.
// ---------------------------------------------------------------------------

function idempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface SellerCataloguePackItem {
  skuId: string;
  packLabel: string;
  skuState: string;
  listed: boolean;
  listingRatePaise: number | null;
}

export interface SellerCatalogueItem {
  /** Null when he carries this product only through a company he deals in. */
  entryId: string | null;
  source: 'manual' | 'dealership';
  productId: string;
  brand: string;
  technical: string;
  manufacturerName: string;
  productState: string;
  /** 25 Oct — a draft company blocks a listing too. */
  manufacturerState: string;
  /** False when Admin switched the product off in Manage. */
  productActive: boolean;
  packsDetailed: boolean;
  /** Active packs only. */
  packs: SellerCataloguePackItem[];
  setAt: string;
  setBy: string | null;
}

/** A company he deals in; every live product of it counts as carried. */
export interface SellerDealershipItem {
  manufacturerId: string;
  name: string;
  state: string;
  productCount: number;
}

export function putSellerDealerships(
  accessToken: string,
  sellerId: string,
  manufacturerIds: string[],
): Promise<SellerDealershipItem[]> {
  return apiFetch(`/staff/purchase/sellers/${sellerId}/dealerships`, {
    method: 'PUT',
    body: { manufacturerIds },
    accessToken,
  });
}

export function getSellerCatalogue(
  accessToken: string,
  sellerId: string,
): Promise<SellerCatalogueItem[]> {
  return apiFetch(`/staff/purchase/sellers/${sellerId}/catalogue`, { accessToken });
}

export function postSellerCatalogueEntry(
  accessToken: string,
  input: { sellerId: string; productId: string; skuIds?: string[] },
  idempotencyKey: string,
): Promise<{ entryId: string }> {
  return apiFetch('/staff/purchase/catalogue', {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export interface SellerFileListingItem {
  listingId: string;
  lineId: string;
  skuId: string;
  packLabel: string;
  ratePaise: number;
  scopeType: string;
  createdAt: string;
  deskEntered: boolean;
  enteredBy: string | null;
  callNote: string | null;
}

export interface SellerScorecard {
  trustTier: string;
  suppliesCompleted: number;
  poCount: number;
  failedCount: number;
  requoteTotal: number;
  strikeCount: number;
  graceRemaining: number;
  blacklisted: boolean;
}

// BR-275's own metrics, read for one seller. Counts/percents only — never a
// rupee figure, same wall as the desk-wide funnel report.
export interface SellerFunnelMetrics {
  sameDayDispatchPct: number | null;
  rejectionRatePct: number | null;
  debitsRaisedCount: number;
  debitsRecoveredCount: number;
  answerRatePct: number | null;
}

export interface SellerOpenDemandItem {
  askId: string;
  skuId: string | null;
  productId: string | null;
  qty: number;
  ageHours: number;
  hasQuoted: boolean;
  brand: string;
  technical: string;
}

export interface SellerFileDto {
  sellerId: string;
  counterpartyId: string;
  firm: string;
  gstin: string;
  ownerName: string;
  mobile: string;
  licenceNo: string;
  trustTier: string;
  dispatchCutoffTime: string;
  suppliesCompleted: number;
  since: string;
  area: Array<{ tehsilId: string; name: string; district: string }>;
  references: Array<{ firm: string; phone: string; whatTheySaid: string }>;
  scorecard: SellerScorecard;
  performance: SellerFunnelMetrics;
  openDebits: Array<{ debitId: string; reason: string; amountPaise: number; netted: boolean }>;
  openReturnNotes: Array<{
    returnNoteId: string;
    poId: string;
    cases: number;
    daysOld: number;
    dueDate: string;
    overdue: boolean;
  }>;
  catalogue: SellerCatalogueItem[];
  dealerships: SellerDealershipItem[];
  listings: SellerFileListingItem[];
  openDemand: SellerOpenDemandItem[];
}

export function getSellerFile(accessToken: string, sellerId: string): Promise<SellerFileDto> {
  return apiFetch(`/staff/purchase/sellers/${sellerId}/file`, { accessToken });
}

export interface SupplyMatrixProductRow {
  productId: string;
  brand: string;
  technical: string;
  manufacturerName: string;
  productState: string;
  // BR-040 — "how well does the market know this price", not a margin value.
  class: 'High' | 'Medium' | 'Low';
  carryCount: number;
  listedCount: number;
}

export function getSupplyMatrixByProduct(accessToken: string): Promise<SupplyMatrixProductRow[]> {
  return apiFetch('/staff/purchase/matrix/by-product', { accessToken });
}

export interface SupplyMatrixCallListItem {
  sellerId: string;
  firm: string;
  state: 'listed' | 'carries';
  ratePaise: number | null;
}

export function getSupplyMatrixCallList(
  accessToken: string,
  productId: string,
): Promise<SupplyMatrixCallListItem[]> {
  return apiFetch(`/staff/purchase/matrix/by-product/${productId}/call-list`, { accessToken });
}

export interface SupplyMatrixSellerRow {
  sellerId: string;
  firm: string;
  trustTier: string;
  /** Phase 4 — his own district, and who he is assigned to (null = the Queue). */
  district: string | null;
  assignedTo: string | null;
  assignedToEmployeeId: string | null;
  carryCount: number;
  listedCount: number;
  manufacturerNames: string[];
}

export function getSupplyMatrixBySeller(accessToken: string): Promise<SupplyMatrixSellerRow[]> {
  return apiFetch('/staff/purchase/matrix/by-seller', { accessToken });
}

export interface PileAwaitingDecisionItem {
  pileId: string;
  sellerId: string;
  sellerCounterpartyId: string;
  sellerFirm: string;
  skuId: string;
  packLabel: string;
  brand: string;
  ratePaise: number;
  boxes: number;
  lineQty: number;
  buyers: number;
  openedAt: string;
  confirmWindowEndsAt: string;
  chaseLeftHours: number;
  gapText: string | null;
}

export function getPilesAwaitingDecision(accessToken: string): Promise<PileAwaitingDecisionItem[]> {
  return apiFetch('/staff/purchase/piles', { accessToken });
}

export function postPileChase(accessToken: string, pileId: string): Promise<{ logged: true }> {
  return apiFetch(`/staff/purchase/piles/${pileId}/chase`, { method: 'POST', accessToken });
}

export interface DispatchQueueItem {
  poId: string;
  poNo: string;
  sellerId: string;
  sellerFirm: string;
  sellerCutoffTime: string;
  brand: string;
  packLabel: string;
  boxes: number;
  bucket: 'due' | 'overdue' | 'in_transit';
  dispatchDueDate: string;
  hoursLeft: number | null;
  sameDayMiss: boolean;
  noDispatch48h: boolean;
  dispatchedAt: string | null;
  daysInTransit: number | null;
  /** The seller's invoice and e-way bill are on record — a flag only, never a block. */
  invoiceRecorded: boolean;
}

// ---------------------------------------------------------------------------
// Stock → PO → Billed → Dispatch.
// ---------------------------------------------------------------------------

export type StockHoldStatus = 'holding' | 'lapsed';

export interface StockQueueItem {
  soId: string;
  soNo: string;
  sellerId: string;
  sellerFirm: string;
  brand: string;
  packLabel: string;
  boxes: number;
  /** Absent in the per-seller funnel, which carries no rupee figure. */
  sellerRatePaise?: number | null;
  payDeadline: string;
  hold: StockHoldStatus;
  holdHours: number | null;
  holdUntil: string;
  holdConfirmedAt: string | null;
  hoursLeft: number;
}

export interface PoStageItem {
  poId: string;
  poNo: string;
  sellerId: string;
  sellerFirm: string;
  brand: string;
  packLabel: string;
  boxes: number;
  releasedAt: string;
  dispatchDueDate: string;
  hoursLeft: number;
  invoiceNo: string | null;
  invoiceDate: string | null;
  ewayNo: string | null;
}

export function getStockQueue(accessToken: string): Promise<StockQueueItem[]> {
  return apiFetch('/staff/purchase/stock', { accessToken });
}

/** Ask the seller to hold the stock until the buyer pays — 24 hours unless told otherwise. */
export function requestStockHold(
  accessToken: string,
  soId: string,
  input: { holdHours?: number; callNote: string },
): Promise<{ holdUntil: string }> {
  return apiFetch(`/staff/purchase/stock/${soId}/hold`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Change how long the seller holds the stock; the hold itself opens with the order. */
export function adjustStockHold(
  accessToken: string,
  soId: string,
  input: { holdHours: number; callNote: string },
): Promise<{ holdUntil: string }> {
  return apiFetch(`/staff/purchase/stock/${soId}/hold/adjust`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function confirmStockHold(
  accessToken: string,
  soId: string,
  input: { callNote: string },
): Promise<{ confirmed: true }> {
  return apiFetch(`/staff/purchase/stock/${soId}/hold/confirm`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function getPoQueue(accessToken: string): Promise<PoStageItem[]> {
  return apiFetch('/staff/purchase/pos', { accessToken });
}

export function getBilledQueue(accessToken: string): Promise<PoStageItem[]> {
  return apiFetch('/staff/purchase/billed', { accessToken });
}

export function recordSellerInvoice(
  accessToken: string,
  poId: string,
  input: { invoiceNo: string; date: string; ewayNo: string; callNote: string },
): Promise<{ recorded: true }> {
  return apiFetch(`/staff/purchase/pos/${poId}/invoice`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export interface SellerDispatchedInput {
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

/** Dispatch → At Indore: the seller has sent it (leg 1), reported on a call. */
export function recordSellerDispatched(
  accessToken: string,
  poId: string,
  input: SellerDispatchedInput,
): Promise<{ movementId: string }> {
  return apiFetch(`/staff/purchase/pos/${poId}/seller-dispatched`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

export function handToDispatch(
  accessToken: string,
  poId: string,
  input: { callNote: string },
): Promise<{ handedOver: true }> {
  return apiFetch(`/staff/purchase/pos/${poId}/hand-to-dispatch`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// The seller file's funnel — one seller's orders, stage by stage.
// ---------------------------------------------------------------------------

export type SellerFunnelKey =
  | 'approved'
  | 'carries'
  | 'on_board'
  | 'quoted'
  | 'confirmations'
  | 'stock'
  | 'po'
  | 'billed'
  | 'dispatch'
  | 'received'
  | 'paid';

export interface SellerFunnelStage {
  key: SellerFunnelKey;
  label: string;
  reached: boolean;
  /** `null` for the yes/no joint (approved). */
  count: number | null;
  /** Items stuck at this joint. */
  leakCount?: number;
}

export interface SellerQuotedRow {
  quoteId: string;
  brand: string;
  technical: string;
  packLabel: string | null;
  boxesAsked: number;
  boxesOffered: number;
  givenAt: string;
  heldUntil: string;
}

export interface SellerPileRow {
  pileId: string;
  sellerCounterpartyId: string;
  brand: string;
  packLabel: string;
  boxes: number;
  buyers: number;
  openedAt: string;
  chaseLeftHours: number;
}

export interface SellerAfterDispatchRow {
  poId: string;
  poNo: string;
  brand: string;
  packLabel: string;
  boxes: number;
  state: string;
  receivedAt: string | null;
  updatedAt: string;
  /** `none`: the dock has not inspected yet · `recorded`: waiting for Purchase to apply it · `applied`. */
  inspection: 'none' | 'recorded' | 'applied';
}

export interface SellerFunnelDto {
  funnel: SellerFunnelStage[];
  stages: {
    quoted: SellerQuotedRow[];
    confirmations: SellerPileRow[];
    stock: StockQueueItem[];
    po: PoStageItem[];
    billed: PoStageItem[];
    dispatch: DispatchQueueItem[];
    received: SellerAfterDispatchRow[];
    paid: SellerAfterDispatchRow[];
  };
}

export function getSellerStageFunnel(
  accessToken: string,
  sellerId: string,
): Promise<SellerFunnelDto> {
  return apiFetch(`/staff/purchase/sellers/${sellerId}/funnel`, { accessToken });
}

export function getDispatchChaseQueue(accessToken: string): Promise<DispatchQueueItem[]> {
  return apiFetch('/staff/purchase/dispatch', { accessToken });
}

export function postDispatchChase(accessToken: string, poId: string): Promise<{ logged: true }> {
  return apiFetch(`/staff/purchase/dispatch/${poId}/chase`, { method: 'POST', accessToken });
}

export interface InspectionPendingApplyItem {
  inspectionId: string;
  poId: string;
  poNo: string;
  sellerId: string;
  sellerFirm: string;
  casesAccepted: number;
  casesRejected: number;
  reasons: string[];
  signedAt: string;
  wholeLot: boolean;
}

export function getInspectionsPendingApply(
  accessToken: string,
): Promise<InspectionPendingApplyItem[]> {
  return apiFetch('/staff/purchase/inspections/pending-apply', { accessToken });
}

// The pre-existing dock endpoint (BR-190's Purchase half) — money-moving, so
// it needs an idempotency key like every other stage-moving POST.
export function postApplyInspection(
  accessToken: string,
  poId: string,
): Promise<{
  soState: string;
  sellerBillId?: string;
  debitNoteId?: string;
  refundId?: string;
  promotionOfferId?: string;
}> {
  return apiFetch(`/staff/pos/${poId}/inspections/apply`, {
    method: 'POST',
    accessToken,
    idempotencyKey: idempotencyKey(),
  });
}

export function getProductAnalysisAll(accessToken: string): Promise<ProductAnalysis[]> {
  return apiFetch('/staff/purchase/products/analysis', { accessToken });
}

export interface ProductFunnelRow {
  productId: string;
  inq: number;
  quoted: number;
  ordered: number;
  fillPct: number | null;
  openBoxes: number;
  sellerCount: number;
}

export function getProductFunnelAll(accessToken: string): Promise<ProductFunnelRow[]> {
  return apiFetch('/staff/purchase/products/funnel', { accessToken });
}

export interface DraftMasterItem {
  kind: 'manufacturer' | 'product' | 'sku';
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: string;
}

export function getDraftMasters(accessToken: string): Promise<DraftMasterItem[]> {
  return apiFetch('/staff/purchase/masters/drafts', { accessToken });
}

export interface MasterManufacturer {
  manufacturerId: string;
  name: string;
  aka: string[];
  state?: 'draft' | 'live';
}

export function getMastersManufacturers(accessToken: string): Promise<MasterManufacturer[]> {
  return apiFetch('/staff/purchase/masters/manufacturers', { accessToken });
}

export function getMastersProducts(accessToken: string): Promise<
  Array<{
    productId: string;
    brand: string;
    technical: string;
    manufacturerName: string;
    state: 'draft' | 'live';
  }>
> {
  return apiFetch('/staff/purchase/masters/products', { accessToken });
}

export function postDraftManufacturer(
  accessToken: string,
  name: string,
  aka?: string[],
): Promise<{ manufacturerId: string }> {
  return apiFetch('/staff/purchase/masters/manufacturers', {
    method: 'POST',
    body: { name, aka },
    accessToken,
  });
}

export function postDraftProduct(
  accessToken: string,
  input: {
    brand: string;
    technical: string;
    manufacturerId: string;
    hsn: string;
    class?: 'High' | 'Medium' | 'Low';
  },
): Promise<{ productId: string }> {
  return apiFetch('/staff/purchase/masters/products', { method: 'POST', body: input, accessToken });
}

export function postDraftSku(
  accessToken: string,
  input: {
    productId: string;
    packLabel: string;
    packSize: number;
    baseUnit: 'LTR' | 'KG' | 'PC';
    unitsPerBox: number;
  },
): Promise<{ skuId: string; baseUnitsPerBox: number }> {
  return apiFetch('/staff/purchase/masters/skus', { method: 'POST', body: input, accessToken });
}

export interface OpenSellerDebitItem {
  debitId: string;
  sellerId: string;
  sellerFirm: string;
  reason: string;
  amountPaise: number;
  raisedAt: string;
}

export function getOpenSellerDebits(accessToken: string): Promise<OpenSellerDebitItem[]> {
  return apiFetch('/staff/purchase/debits', { accessToken });
}

export interface OnBoardNotQuotedItem {
  askId: string;
  productId: string | null;
  brand: string;
  qty: number;
  sellersListedNotQuoted: number;
}

export function getOnBoardNotQuotedQueue(accessToken: string): Promise<OnBoardNotQuotedItem[]> {
  return apiFetch('/staff/purchase/demand/on-board-not-quoted', { accessToken });
}

/** Phase 4 — who the caller may assign a seller to (himself; his team; Admin: all Purchase). */
export function getAssignablePurchasePeople(
  accessToken: string,
): Promise<import('./dto').AssignableSalesPerson[]> {
  return apiFetch('/staff/purchase/assignees', { accessToken });
}
