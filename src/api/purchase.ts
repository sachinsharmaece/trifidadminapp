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
