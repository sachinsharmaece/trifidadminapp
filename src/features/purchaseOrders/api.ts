import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/**
 * Purchase orders: read only. Raised by the trade engine when Accounts confirms the buyer has paid in full.
 * A PO names the seller and his rate, never the buyer (Purchase reads it).
 */
const rowSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(['RAISED']),
  seller: z.object({ number: z.string(), firmName: z.string() }),
  item: z.string(),
  totalPaise: z.number(),
  dispatchDueAt: z.string(),
  createdAt: z.string(),
});
export type PurchaseOrderRow = z.infer<typeof rowSchema>;

const purchaseOrderSchema = rowSchema.extend({
  tradeId: z.string(),
  seller: z.object({
    id: z.string(),
    number: z.string(),
    firmName: z.string(),
    gstin: z.string().nullable(),
  }),
  lines: z.array(
    z.object({
      lineNo: z.number(),
      productName: z.string(),
      packLabel: z.string(),
      unitsPerBox: z.number(),
      boxes: z.number(),
      expiryMonth: z.string(),
      batchNumber: z.string().nullable(),
      landedPaisePerUnit: z.number(),
      rateType: z.enum(['FOR', 'EX']).nullable(),
      exRatePaisePerUnit: z.number().nullable(),
      colPaisePerBox: z.number().nullable(),
      lineTotalPaise: z.number(),
    }),
  ),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export async function listPurchaseOrders(
  params: { q: string; page: number; pageSize: number },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>('/purchase-orders', { params, signal });
  return z
    .object({
      purchaseOrders: z.array(rowSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

export async function getPurchaseOrder(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/purchase-orders/${id}`, { signal });
  return z.object({ purchaseOrder: purchaseOrderSchema }).parse(data).purchaseOrder;
}
