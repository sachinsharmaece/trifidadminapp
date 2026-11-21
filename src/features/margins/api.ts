import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { BUYER_TIERS, CELL_STATUSES, type BuyerTier } from '@/types/margin';
import { SKU_CLASSES, type SkuClass } from '@/types/product';

/** One line of the margin matrix: the margin for a pack class and buyer tier, from a date onwards. */
const marginCellSchema = z.object({
  id: z.string(),
  skuClass: z.enum(SKU_CLASSES),
  buyerTier: z.enum(BUYER_TIERS),
  /** 2000 means 20%. */
  marginBp: z.number(),
  effectiveFrom: z.string(),
  status: z.enum(CELL_STATUSES),
  createdBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  createdAt: z.string(),
});

export type MarginCell = z.infer<typeof marginCellSchema>;

const listSchema = z.object({ cells: z.array(marginCellSchema) });
const oneSchema = z.object({ cell: marginCellSchema });

export interface MarginCellInput {
  skuClass: SkuClass;
  buyerTier: BuyerTier;
  marginBp: number;
  /** A date and time with an offset, like "2026-12-01T00:00:00+05:30". Leave it out to start now. */
  effectiveFrom?: string | undefined;
}

/** Every line ever set, grouped by class and tier. Only Controller, Founder and Admin may ask. */
export async function listMarginCells(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/margin-cells', { signal });
  return listSchema.parse(data).cells;
}

/** Needs a recent password check (see `confirmPassword`). A line is never edited: this adds a new one. */
export async function createMarginCell(input: MarginCellInput): Promise<MarginCell> {
  const { data } = await apiClient.post<unknown>('/margin-cells', input);
  return oneSchema.parse(data).cell;
}
