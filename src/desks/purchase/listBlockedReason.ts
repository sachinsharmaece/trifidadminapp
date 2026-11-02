import type { SellerCatalogueItem } from '../../api/purchase';

/**
 * Why a product on a seller's file can't be listed yet, or null when it can.
 * "Add to listing" is on every product; this is what the desk is told when
 * the listing would be refused (a draft product, or no live pack to rate).
 */
export function listBlockedReason(c: SellerCatalogueItem): string | null {
  if (c.productActive === false) return 'Admin has switched this product off in Manage → Products';
  if (c.productState === 'draft') return 'it is a draft product, Admin has to confirm it first';
  if (c.manufacturerState === 'draft')
    return 'its company is a draft, Admin has to confirm it first';
  if (c.packs.length === 0)
    return 'it has no active pack yet — Admin adds packs in Manage → Products';
  if (c.packs.every((p) => p.skuState === 'draft')) return 'all its packs are still drafts';
  return null;
}
