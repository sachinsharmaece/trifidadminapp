import { apiFetch } from './client';
import type { ManufacturerDto, ProductDto, SkuDto, SkuImportRowResult } from './dto';

// API-020
export function getTechnicals(accessToken: string): Promise<string[]> {
  return apiFetch('/catalog/technicals', { accessToken });
}

// API-022 — the admin masters screen reuses the cascading picker (technical
// first) rather than a separate "list all products" endpoint, which does
// not exist (ARCHITECTURE.md §M3: "technical is always the first and only
// required step").
export function getProductsForTechnical(
  accessToken: string,
  technical: string,
): Promise<ProductDto[]> {
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
