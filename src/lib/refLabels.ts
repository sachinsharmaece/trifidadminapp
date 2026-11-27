/** Labels the reference shows (lib/buyerTierLabels.ts, lib/productCategories.ts, lib/indianStates.ts). */
export const TIER_LABELS: Record<string, string> = {
  TRADER: 'Trader',
  DISTRIBUTOR: 'Distributor',
  DEALER: 'Dealer',
  WHOLESALER: 'Dealer',
  RETAILER: 'Retailer',
};
export const tierLabel = (value: string) => TIER_LABELS[value] ?? value;

export const PRODUCT_CATEGORIES = ['PESTICIDE', 'FERTILIZER', 'SEED', 'OTHER'] as const;
export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number];
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  PESTICIDE: 'Pesticide',
  FERTILIZER: 'Fertilizer',
  SEED: 'Seed',
  OTHER: 'Other',
};

export const BASE_UNITS = ['LTR', 'KG', 'PC', 'GM', 'ML'] as const;
export type BaseUnitValue = (typeof BASE_UNITS)[number];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;
