import { apiFetch } from './client';
import type { MarginMatrixCellDto } from './dto';

// API-131.
export function getMarginMatrix(accessToken: string): Promise<MarginMatrixCellDto[]> {
  return apiFetch('/admin/margin-matrix', { accessToken });
}

export function setMarginMatrixCell(
  accessToken: string,
  input: { class: string; tier: string; pct: number; effectiveFrom: string },
): Promise<MarginMatrixCellDto> {
  return apiFetch('/admin/margin-matrix', { method: 'PUT', body: input, accessToken });
}
