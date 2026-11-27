import { z } from 'zod';
import { payoutFactsSchema } from '@/features/payouts/api';
import { apiClient } from '@/services/api/client';
import {
  FREIGHT_TERMS,
  INSPECTION_OUTCOMES,
  LEG1_MODES,
  PURCHASE_ORDER_STATUSES,
  RETURN_NOTE_TYPES,
} from '@/types/dock';

/**
 * Purchase orders: read only here. Raised by the trade engine when Accounts confirms the buyer has paid in full;
 * dispatch (Purchase) and the dock (Logistics) are engine buttons too. A PO names the seller and his rate, never
 * the buyer (Purchase reads it).
 */

/** Leg 1, the seller's bill, the arrival and the dock's result. Also on the deal card's seller side. */
export const dockFactsShape = {
  leg1: z
    .object({
      mode: z.enum(LEG1_MODES),
      transporter: z.string().nullable(),
      lrNumber: z.string().nullable(),
      lrDate: z.string().nullable(),
      busDetails: z.string().nullable(),
      driverName: z.string().nullable(),
      driverMobile: z.string().nullable(),
      note: z.string().nullable(),
      freightTerms: z.enum(FREIGHT_TERMS),
      freightPaise: z.number().nullable(),
      dispatchedOn: z.string(),
      lines: z.array(
        z.object({
          lineNo: z.number(),
          batchDeclared: z.string().nullable(),
          expiryDeclared: z.string().nullable(),
          shortExpiryAgreed: z.boolean(),
        }),
      ),
      at: z.string(),
    })
    .nullable(),
  sellerBill: z
    .object({ number: z.string(), amountPaise: z.number(), billDate: z.string(), at: z.string() })
    .nullable(),
  arrival: z
    .object({ arrivedAt: z.string(), boxesCounted: z.number(), billWithGoods: z.boolean() })
    .nullable(),
  inspectBy: z.string().nullable(),
  outcome: z.enum(INSPECTION_OUTCOMES).nullable(),
  acceptedBoxes: z.number().nullable(),
  acceptedValuePaise: z.number().nullable(),
  inspectedAt: z.string().nullable(),
};

const rowSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(PURCHASE_ORDER_STATUSES),
  seller: z.object({ number: z.string(), firmName: z.string() }),
  item: z.string(),
  totalPaise: z.number(),
  dispatchDueAt: z.string(),
  createdAt: z.string(),
  /** When the seller was paid (the bank proof was typed); null until then. */
  paidAt: z.string().nullable(),
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
  ...dockFactsShape,
  /** Where the seller's payment is: in a batch, released, or paid with its UTR (Build 5). */
  payout: payoutFactsSchema.nullable(),
  inspection: z
    .object({
      outcome: z.enum(INSPECTION_OUTCOMES),
      boxesCounted: z.number(),
      note: z.string().nullable(),
      savedAt: z.string(),
      lines: z.array(
        z.object({
          lineNo: z.number(),
          boxesOnPo: z.number(),
          boxesShort: z.number(),
          boxesDamaged: z.number(),
          boxesLeaking: z.number(),
          boxesAccepted: z.number(),
          boxesExcess: z.number(),
          batchFound: z.string().nullable(),
          expiryFound: z.string().nullable(),
          batchDiffers: z.boolean(),
          expiryDiffers: z.boolean(),
          belowShelfLife: z.boolean(),
          shortExpiryAgreed: z.boolean(),
        }),
      ),
    })
    .nullable(),
  returnNotes: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      type: z.enum(RETURN_NOTE_TYPES),
      boxes: z.number(),
      reason: z.string(),
      state: z.enum(['OPEN', 'CLOSED']),
      dueAt: z.string(),
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
