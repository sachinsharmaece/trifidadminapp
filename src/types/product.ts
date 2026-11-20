/** Must match PRODUCT_CATEGORIES and SKU_CLASSES in the server (shared/enums.ts). */
export const PRODUCT_CATEGORIES = ['PESTICIDE', 'FERTILIZER', 'SEED', 'OTHER'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  PESTICIDE: 'Pesticide',
  FERTILIZER: 'Fertilizer',
  SEED: 'Seed',
  OTHER: 'Other',
};

/** Pack class: together with the buyer's tier it decides the margin. */
export const SKU_CLASSES = ['A', 'B', 'C'] as const;
export type SkuClass = (typeof SKU_CLASSES)[number];
