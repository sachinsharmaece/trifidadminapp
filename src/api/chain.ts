import { apiFetch } from './client';
import type { ChainViewDto, CreateSoResult } from './dto';

// New — BR-048 staff price with pre-fill and override.
export function createSo(
  accessToken: string,
  input: {
    buyerId: string;
    sellerId: string;
    skuId: string;
    boxes: number;
    sellerNetPaise: number;
    placeOfSupply: 'intra_state' | 'inter_state';
    overrideRatePaise?: number;
    overrideReasonCode?: string;
  },
): Promise<CreateSoResult> {
  return apiFetch('/staff/so', { method: 'POST', body: input, accessToken });
}

// API-084 — 409 unless the SO is paid in full (INV-01).
export function createPo(
  accessToken: string,
  soId: string,
): Promise<{ poId: string; poNo: string }> {
  return apiFetch(`/staff/so/${soId}/po`, { method: 'POST', body: {}, accessToken });
}

export function editPo(
  accessToken: string,
  poId: string,
  input: { field: 'rate' | 'qty'; to: number; reason: string },
): Promise<{ edited: boolean }> {
  return apiFetch(`/staff/po/${poId}/edit`, { method: 'POST', body: input, accessToken });
}

// Q6.
export function reduceSoQuantity(
  accessToken: string,
  soId: string,
  input: { newBoxes: number; reason: string; inspectionId: string },
): Promise<{ refundId: string }> {
  return apiFetch(`/staff/so/${soId}/reduce-quantity`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

// API-090 — BR-031/BR-037, the chain strip and full document view.
export function getChain(accessToken: string, chainId: string): Promise<ChainViewDto> {
  return apiFetch(`/staff/chains/${chainId}`, { accessToken });
}
