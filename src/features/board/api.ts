import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { EXPIRY_BANDS } from '@/types/listing';
import { TRADE_POSITIONS } from '@/types/party';

/**
 * One offer on the rate board. It holds only what Sales may see: the finished buyer rate, never the seller,
 * the seller's rate or the margin (the server leaves them out). All money is whole paise.
 */
const boardRowSchema = z.object({
  id: z.string(),
  productName: z.string(),
  manufacturerName: z.string(),
  packLabel: z.string(),
  unitsPerBox: z.number(),
  /** Null when the margin matrix has no cell for this pack's class and the buyer's tier. */
  buyerRatePaisePerUnit: z.number().nullable(),
  boxValuePaise: z.number().nullable(),
  expiryBand: z.enum(EXPIRY_BANDS),
  moqBoxes: z.number(),
  quantityBoxes: z.number(),
});

export type BoardRow = z.infer<typeof boardRowSchema>;

const boardSchema = z.object({
  buyer: z.object({
    id: z.string(),
    number: z.string(),
    firmName: z.string(),
    /** The tier the rates are worked out for. */
    tier: z.enum([...TRADE_POSITIONS, 'TRADER']),
    /** True while the buyer is not classified: the tier is a guess (priced as Retailer), so the rates are indicative. */
    indicative: z.boolean(),
  }),
  rows: z.array(boardRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Board = z.infer<typeof boardSchema>;

export interface BoardParams {
  /** Part of a product name. */
  q: string;
  page: number;
  pageSize: number;
}

export async function getBoard(buyerId: string, params: BoardParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/buyers/${buyerId}/board`, { params, signal });
  return boardSchema.parse(data);
}
