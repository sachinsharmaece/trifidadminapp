import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import {
  PRODUCT_CATEGORIES,
  SKU_CLASSES,
  type ProductCategory,
  type SkuClass,
} from '@/types/product';

/** One pack of a product, like "500 ML, 20 per box". */
const skuSchema = z.object({
  id: z.string(),
  productId: z.string(),
  packLabel: z.string(),
  unitsPerBox: z.number(),
  skuClass: z.enum(SKU_CLASSES),
  active: z.boolean(),
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  manufacturerId: z.string(),
  technicalId: z.string(),
  hsnCodeId: z.string(),
  /** GST rate in basis points: 1800 is 18%. */
  taxBp: z.number(),
  active: z.boolean(),
  skus: z.array(skuSchema),
});

export type Sku = z.infer<typeof skuSchema>;
export type Product = z.infer<typeof productSchema>;

const productListSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const productOneSchema = z.object({ product: productSchema });
const skuOneSchema = z.object({ sku: skuSchema });

export interface ProductListParams {
  q: string;
  page: number;
  pageSize: number;
}

/** What the API needs to describe one pack. */
export interface PackInput {
  packLabel: string;
  unitsPerBox: number;
  skuClass: SkuClass;
}

export interface ProductDetailsInput {
  name: string;
  category: ProductCategory;
  manufacturerId: string;
  technicalId: string;
  hsnCodeId: string;
  taxBp: number;
}

export async function listProducts(params: ProductListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/products', { params, signal });
  return productListSchema.parse(data);
}

export async function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  const { data } = await apiClient.get<unknown>(`/products/${id}`, { signal });
  return productOneSchema.parse(data).product;
}

/** A product always starts with at least one pack; the server saves them together. */
export async function createProduct(
  input: ProductDetailsInput & { skus: PackInput[] },
): Promise<Product> {
  const { data } = await apiClient.post<unknown>('/products', input);
  return productOneSchema.parse(data).product;
}

export async function updateProduct(
  id: string,
  changes: Partial<ProductDetailsInput> & { active?: boolean },
): Promise<Product> {
  const { data } = await apiClient.patch<unknown>(`/products/${id}`, changes);
  return productOneSchema.parse(data).product;
}

export async function addSku(productId: string, input: PackInput): Promise<Sku> {
  const { data } = await apiClient.post<unknown>(`/products/${productId}/skus`, input);
  return skuOneSchema.parse(data).sku;
}

export async function updateSku(
  id: string,
  changes: Partial<PackInput> & { active?: boolean },
): Promise<Sku> {
  const { data } = await apiClient.patch<unknown>(`/skus/${id}`, changes);
  return skuOneSchema.parse(data).sku;
}
