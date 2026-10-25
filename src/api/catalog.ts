import { apiFetch } from './client';
import type {
  HsnDto,
  ManufacturerDto,
  ProductCategory,
  ProductDto,
  SkuDto,
  SkuImportRowResult,
  TechnicalDto,
} from './dto';

export type PackUnit = 'LTR' | 'ML' | 'KG' | 'GM' | 'PC';

/** A pack as typed on the product form; the server derives the label and base unit. */
export interface ProductPackInput {
  packSize: number;
  unit: PackUnit;
  unitsPerBox: number;
}

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

/** The searchable product dropdown on staff call forms — brand or technical, no technical needed first. */
export function searchProducts(
  accessToken: string,
  query: string,
): Promise<Array<{ productId: string; brand: string; technical: string }>> {
  return apiFetch(`/catalog/product-search?q=${encodeURIComponent(query)}`, { accessToken });
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
  idempotencyKey: string,
  aka?: string[],
): Promise<{ manufacturerId: string }> {
  return apiFetch('/admin/manufacturers', {
    method: 'POST',
    body: { name, aka },
    accessToken,
    idempotencyKey,
  });
}

// Purchase-desk v2 — Admin's rename/confirm action (the draft → live PATCH).
export function updateManufacturer(
  accessToken: string,
  manufacturerId: string,
  input: Partial<{ name: string; aka: string[]; state: 'live' }>,
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
    category: ProductCategory;
    taxPercent: number;
    class?: 'High' | 'Medium' | 'Low';
    packs?: ProductPackInput[];
  },
  idempotencyKey: string,
): Promise<{ productId: string; skuIds: string[] }> {
  return apiFetch('/admin/products', { method: 'POST', body: input, accessToken, idempotencyKey });
}

// Technical and HSN masters — the product form's pickers.
export function getTechnicalMasters(accessToken: string): Promise<TechnicalDto[]> {
  return apiFetch('/admin/technicals', { accessToken });
}

export function createTechnical(
  accessToken: string,
  name: string,
  idempotencyKey: string,
): Promise<{ technicalId: string }> {
  return apiFetch('/admin/technicals', {
    method: 'POST',
    body: { name },
    accessToken,
    idempotencyKey,
  });
}

export function getHsnMasters(accessToken: string): Promise<HsnDto[]> {
  return apiFetch('/admin/hsn', { accessToken });
}

export function createHsn(
  accessToken: string,
  input: { code: string; description?: string; taxPercent: number },
  idempotencyKey: string,
): Promise<{ hsnId: string }> {
  return apiFetch('/admin/hsn', { method: 'POST', body: input, accessToken, idempotencyKey });
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
    category: ProductCategory;
    taxPercent: number;
    class: 'High' | 'Medium' | 'Low';
    active: boolean;
    state: 'live';
  }>,
  idempotencyKey: string,
): Promise<{ productId: string }> {
  return apiFetch(`/admin/products/${productId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    idempotencyKey,
  });
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
  idempotencyKey: string,
): Promise<SkuImportRowResult[]> {
  return apiFetch('/admin/skus/import', {
    method: 'POST',
    body: { productId, rows },
    accessToken,
    idempotencyKey,
  });
}

// New — the Manage desk's own SKU edit. `baseUnit` is deliberately not an
// accepted field here (BR-055 — immutable at the schema level).
export function updateSku(
  accessToken: string,
  skuId: string,
  input: Partial<{
    packLabel: string;
    /** With `unit`, in that unit (500 for 500 ML); the unit itself cannot change. */
    packSize: number;
    unit: PackUnit;
    unitsPerBox: number;
    active: boolean;
    state: 'live';
  }>,
  idempotencyKey: string,
): Promise<{ skuId: string; baseUnitsPerBox: number }> {
  return apiFetch(`/admin/skus/${skuId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

/** 24 Oct — the Manage desk's own pack list: every pack, inactive and draft too, read in its own unit. */
export interface AdminSkuDto extends SkuDto {
  unit: PackUnit;
  displaySize: number;
}

export function getAdminSkus(accessToken: string, productId: string): Promise<AdminSkuDto[]> {
  return apiFetch(`/admin/products/${productId}/skus`, { accessToken });
}

/** 24 Oct — "Add pack" on an existing product, typed as on create. */
export function addProductPacks(
  accessToken: string,
  productId: string,
  packs: ProductPackInput[],
  idempotencyKey: string,
): Promise<{ skuIds: string[] }> {
  return apiFetch(`/admin/products/${productId}/packs`, {
    method: 'POST',
    body: { packs },
    accessToken,
    idempotencyKey,
  });
}
