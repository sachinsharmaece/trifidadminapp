import { apiFetch } from './client';
import type { ManufacturerDto, ProductDto, SkuDto, SkuImportRowResult } from './dto';

// API-020
export function getTechnicals(accessToken: string): Promise<string[]> {
  return apiFetch('/catalog/technicals', { accessToken });
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
