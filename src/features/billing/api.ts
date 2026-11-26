import { z } from 'zod';
import type { MargBillInput } from '@/features/trades/api';
import { apiClient } from '@/services/api/client';
import { BOOK_WITH_MODES, TRIP_STATUSES } from '@/types/dock';
import { SALES_ORDER_STATUSES } from '@/types/salesOrder';

/**
 * The Marg bill (Build 4). Buyer side of the wall: our selling price. Accounts keys it from "To be billed"; it
 * presses the same engine action as the deal card (`recordMargBill`), with the trade's version.
 */

/** What the dock accepted per order line, at the buyer's rate (the most the Marg bill may be). */
export const acceptedSchema = z.object({
  purchaseOrderId: z.string(),
  inspectedAt: z.string().nullable(),
  lines: z.array(
    z.object({
      lineNo: z.number(),
      productName: z.string(),
      packLabel: z.string(),
      unitsPerBox: z.number(),
      orderedBoxes: z.number(),
      acceptedBoxes: z.number(),
      buyerRatePaisePerUnit: z.number(),
      acceptedValuePaise: z.number(),
      batch: z.string().nullable(),
      expiryMonth: z.string().nullable(),
    }),
  ),
  acceptedBoxes: z.number(),
  expectedPaise: z.number(),
});
export type Accepted = z.infer<typeof acceptedSchema>;

export const margBillSchema = z.object({
  invoiceNumber: z.string(),
  ewayBillNumber: z.string().nullable(),
  billDate: z.string(),
  totalPaise: z.number(),
  expectedPaise: z.number(),
  /** Positive when the bill is lower than the accepted value (allowed, Q-ACC-02). */
  shortByPaise: z.number(),
  lines: z.array(z.object({ lineNo: z.number(), boxes: z.number() })),
  at: z.string(),
});
export type MargBill = z.infer<typeof margBillSchema>;

/** The trip an order is on, its POD, and the dispatch and delivery dates. */
export const deliveryShape = {
  trip: z
    .object({
      code: z.string(),
      status: z.enum(TRIP_STATUSES),
      vehicleNumber: z.string(),
      bookWith: z.object({ mode: z.enum(BOOK_WITH_MODES), transporter: z.string().nullable() }),
      pod: z.object({ ref: z.string(), date: z.string() }).nullable(),
    })
    .nullable(),
  dispatchedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
};

const rowSchema = z.object({
  salesOrderId: z.string(),
  number: z.string(),
  status: z.enum(SALES_ORDER_STATUSES),
  tradeId: z.string(),
  tradeVersion: z.number().nullable(),
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  interState: z.boolean(),
  totalPaise: z.number(),
  accepted: acceptedSchema.nullable(),
  refundsDuePaise: z.number(),
  margBill: margBillSchema.nullable(),
});
export type BillingRow = z.infer<typeof rowSchema>;

export interface BillingParams {
  state: 'TO_BILL' | 'BILLED';
  q: string;
  page: number;
  pageSize: number;
}

export async function listToBeBilled(params: BillingParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/to-be-billed', { params, signal });
  return z
    .object({ rows: z.array(rowSchema), total: z.number(), page: z.number(), pageSize: z.number() })
    .parse(data);
}

/** The engine action "Marg bill" for this order's trade. */
export async function recordMargBill(row: BillingRow, input: MargBillInput) {
  const { data } = await apiClient.post<unknown>(`/to-be-billed/${row.salesOrderId}/marg-bill`, {
    version: row.tradeVersion,
    ...input,
  });
  return z.object({ row: rowSchema }).parse(data).row;
}
