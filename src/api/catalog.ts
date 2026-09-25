import { apiFetch } from './client';
import type { ManufacturerDto, ProductDto, SkuDto, SkuImportRowResult } from './dto';

// API-020
export function getTechnicals(accessToken: string): Promise<string[]> {
  return apiFetch('/catalog/technicals', { accessToken });
}

// API-021 — step 2 of the cascading picker (BR-111). Any authenticated staff
// member, unlike `/admin/manufacturers` below — this is what lets Purchase's
// "what does he carry" form pick a company without CATALOG_WRITE.
export function getManufacturersForTechnical(
  accessToken: string,
  technical: string,
): Promise<Array<{ manufacturerId: string; name: string }>> {
  return apiFetch(`/catalog/manufacturers?technical=${encodeURIComponent(technical)}`, {
    accessToken,
  });
}

// API-022 — the technical-scoped product picker (BR-111).
export function getProductsByTechnical(
  accessToken: string,
  technical: string,
): Promise<Array<{ productId: string; brand: string; hsn: string; class: string }>> {
  return apiFetch(`/catalog/products?technical=${encodeURIComponent(technical)}`, { accessToken });
}

// API-023
export function getSkusForProduct(accessToken: string, productId: string): Promise<SkuDto[]> {
  return apiFetch(`/catalog/products/${productId}/skus`, { accessToken });
}

// New — see catalog.service.ts's createManufacturer/listAllManufacturers.
export function getAllManufacturers(accessToken: string): Promise<ManufacturerDto[]> {
  return apiFetch('/admin/manufacturers', { accessToken });
}

export function createManufacturer(
  accessToken: string,
  name: string,
): Promise<{ manufacturerId: string }> {
  return apiFetch('/admin/manufacturers', { method: 'POST', body: { name }, accessToken });
}

// Purchase-desk v2 — Admin's rename/confirm action (the draft → live PATCH).
export function updateManufacturer(
  accessToken: string,
  manufacturerId: string,
  input: Partial<{ name: string; state: 'live' }>,
): Promise<{ manufacturerId: string }> {
  return apiFetch(`/admin/manufacturers/${manufacturerId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

// New — the Manage desk's own unfiltered product list (distinct from
// API-022's technical-scoped picker, which BR-111 governs).
export function getAllProducts(accessToken: string, limit = 100): Promise<ProductDto[]> {
  return apiFetch(`/admin/products?limit=${limit}`, { accessToken });
}

export function getProductById(accessToken: string, productId: string): Promise<ProductDto> {
  return apiFetch(`/admin/products/${productId}`, { accessToken });
}

// API-024
export function createProduct(
  accessToken: string,
  input: {
    brand: string;
    technical: string;
    manufacturerId: string;
    hsn: string;
    class?: 'A' | 'B' | 'C';
  },
): Promise<{ productId: string }> {
  return apiFetch('/admin/products', { method: 'POST', body: input, accessToken });
}

// API-024 PATCH — was built server-side but had no client function yet.
export function updateProduct(
  accessToken: string,
  productId: string,
  input: Partial<{
    brand: string;
    technical: string;
    manufacturerId: string;
    hsn: string;
    class: 'A' | 'B' | 'C';
    active: boolean;
    state: 'live';
  }>,
): Promise<{ productId: string }> {
  return apiFetch(`/admin/products/${productId}`, { method: 'PATCH', body: input, accessToken });
}

// API-025
export interface SkuImportRowInput {
  packLabel: string;
  packSize: unknown;
  baseUnit: unknown;
  unitsPerBox: unknown;
}

export function importSkus(
  accessToken: string,
  productId: string,
  rows: SkuImportRowInput[],
): Promise<SkuImportRowResult[]> {
  return apiFetch('/admin/skus/import', { method: 'POST', body: { productId, rows }, accessToken });
}

// New — the Manage desk's own SKU edit. `baseUnit` is deliberately not an
// accepted field here (BR-055 — immutable at the schema level).
export function updateSku(
  accessToken: string,
  skuId: string,
  input: Partial<{
    packLabel: string;
    packSize: number;
    unitsPerBox: number;
    active: boolean;
    state: 'live';
  }>,
): Promise<{ skuId: string; baseUnitsPerBox: number }> {
  return apiFetch(`/admin/skus/${skuId}`, { method: 'PATCH', body: input, accessToken });
}
