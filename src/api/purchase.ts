import { apiFetch } from './client';

export interface ActiveDemandItem {
  askId: string;
  qty: number;
  skuId: string | null;
  productId: string | null;
  createdAt: string;
  sellerCounts: { quoted: number; active: number; dormant: number; dark: number };
  noSeller: boolean;
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
  entryId: string;
  productId: string;
  brand: string;
  technical: string;
  manufacturerName: string;
  productState: string;
  packsDetailed: boolean;
  packs: SellerCataloguePackItem[];
  setAt: string;
  setBy: string;
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
): Promise<{ entryId: string }> {
  return apiFetch('/staff/purchase/catalogue', { method: 'POST', body: input, accessToken });
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

export interface SellerOpenDemandItem {
  askId: string;
  skuId: string | null;
  productId: string | null;
  qty: number;
  ageHours: number;
  hasQuoted: boolean;
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
  openDebits: Array<{ debitId: string; reason: string; amountPaise: number; netted: boolean }>;
  openReturnNotes: Array<{
    returnNoteId: string;
    poId: string;
    cases: number;
    daysOld: number;
    overdue: boolean;
  }>;
  catalogue: SellerCatalogueItem[];
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
  carryCount: number;
  listedCount: number;
}

export function getSupplyMatrixByProduct(accessToken: string): Promise<SupplyMatrixProductRow[]> {
  return apiFetch('/staff/purchase/matrix/by-product', { accessToken });
}

export interface SupplyMatrixSellerRow {
  sellerId: string;
  firm: string;
  trustTier: string;
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
  skuId: string;
  ratePaise: number;
  boxes: number;
  buyers: number;
  openedAt: string;
  confirmWindowEndsAt: string;
  chaseLeftHours: number;
}

export function getPilesAwaitingDecision(accessToken: string): Promise<PileAwaitingDecisionItem[]> {
  return apiFetch('/staff/purchase/piles', { accessToken });
}

export interface DispatchQueueItem {
  poId: string;
  poNo: string;
  sellerId: string;
  bucket: 'due' | 'overdue' | 'in_transit';
  dispatchDueDate: string;
  hoursLeft: number | null;
  sameDayMiss: boolean;
  noDispatch48h: boolean;
  dispatchedAt: string | null;
  daysInTransit: number | null;
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

export function getMastersManufacturers(
  accessToken: string,
): Promise<Array<{ manufacturerId: string; name: string; state?: 'draft' | 'live' }>> {
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
): Promise<{ manufacturerId: string }> {
  return apiFetch('/staff/purchase/masters/manufacturers', {
    method: 'POST',
    body: { name },
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
    class?: 'A' | 'B' | 'C';
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
  reason: string;
  amountPaise: number;
  raisedAt: string;
}

export function getOpenSellerDebits(accessToken: string): Promise<OpenSellerDebitItem[]> {
  return apiFetch('/staff/purchase/debits', { accessToken });
}
