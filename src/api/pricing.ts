import { apiFetch } from './client';
import type { MarginMatrixCellDto, MarginMatrixHistoryRowDto, ProductMarginRowDto } from './dto';

// API-131.
export function getMarginMatrix(accessToken: string): Promise<MarginMatrixCellDto[]> {
  return apiFetch('/admin/margin-matrix', { accessToken });
}

// API-132 — several cells under one effectiveFrom, saved in one write.
export function setMarginMatrixBulk(
  accessToken: string,
  input: {
    cells: Array<{ class: string; tier: string; pct: number }>;
    effectiveFrom: string;
  },
): Promise<MarginMatrixCellDto[]> {
  return apiFetch('/admin/margin-matrix/bulk', { method: 'PUT', body: input, accessToken });
}

// API-133 — every row ever written, newest effective date first.
export function getMarginMatrixHistory(accessToken: string): Promise<MarginMatrixHistoryRowDto[]> {
  return apiFetch('/admin/margin-matrix/history', { accessToken });
}

// A product's own rupee margin — the cells in effect now (a tier with none is on the class matrix).
export function getProductMargin(
  accessToken: string,
  productId: string,
): Promise<ProductMarginRowDto[]> {
  return apiFetch(`/admin/products/${productId}/margin-matrix`, { accessToken });
}

export function getProductMarginHistory(
  accessToken: string,
  productId: string,
): Promise<ProductMarginRowDto[]> {
  return apiFetch(`/admin/products/${productId}/margin-matrix/history`, { accessToken });
}

// Several tiers under one effectiveFrom; `marginPaise: null` sends a tier back to the class matrix.
export function setProductMargin(
  accessToken: string,
  productId: string,
  input: {
    cells: Array<{ tier: string; marginPaise: number | null }>;
    effectiveFrom: string;
  },
  idempotencyKey: string,
): Promise<ProductMarginRowDto[]> {
  return apiFetch(`/admin/products/${productId}/margin-matrix`, {
    method: 'PUT',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

export function setMarginMatrixCell(
  accessToken: string,
  input: { class: string; tier: string; pct: number; effectiveFrom: string },
): Promise<MarginMatrixCellDto> {
  return apiFetch('/admin/margin-matrix', { method: 'PUT', body: input, accessToken });
}
