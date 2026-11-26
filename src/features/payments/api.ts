import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { RECEIPT_STATUSES, type ReceiptStatus } from '@/types/books';

/** One row of "Payments to confirm" (the Accounts queue): buyer side only, never the seller. */
const paymentRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(RECEIPT_STATUSES),
  amountPaise: z.number(),
  utr: z.string(),
  receivedOn: z.string(),
  bankName: z.string(),
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  salesOrder: z.object({
    id: z.string(),
    number: z.string(),
    totalPaise: z.number(),
    paidPaise: z.number(),
  }),
  enteredBy: z.string(),
  enteredAt: z.string(),
  /** Maker ≠ checker: the person who entered it may not confirm or reject it. */
  enteredByMe: z.boolean(),
  tradeId: z.string(),
  /** Sent back with every press (the engine's version check). */
  tradeVersion: z.number(),
  voucherNumber: z.string().nullable(),
  rejectNote: z.string().nullable(),
  canOpenTrade: z.boolean(),
});
export type PaymentRow = z.infer<typeof paymentRowSchema>;

export interface PaymentListParams {
  status: ReceiptStatus;
  q: string;
  page: number;
  pageSize: number;
}

export async function listPayments(params: PaymentListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/payments', { params, signal });
  return z
    .object({
      payments: z.array(paymentRowSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

const oneSchema = z.object({ payment: paymentRowSchema });

/** The same engine action as "Confirm payment" on the deal card. */
export async function confirmPayment(row: PaymentRow) {
  const { data } = await apiClient.post<unknown>(`/payments/${row.id}/confirm`, {
    version: row.tradeVersion,
  });
  return oneSchema.parse(data).payment;
}

export async function rejectPayment(row: PaymentRow, note: string) {
  const { data } = await apiClient.post<unknown>(`/payments/${row.id}/reject`, {
    version: row.tradeVersion,
    note,
  });
  return oneSchema.parse(data).payment;
}
