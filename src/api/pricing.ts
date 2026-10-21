import { apiFetch } from './client';
import type { MarginMatrixCellDto, MarginMatrixHistoryRowDto } from './dto';

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

export function setMarginMatrixCell(
  accessToken: string,
  input: { class: string; tier: string; pct: number; effectiveFrom: string },
): Promise<MarginMatrixCellDto> {
  return apiFetch('/admin/margin-matrix', { method: 'PUT', body: input, accessToken });
}
