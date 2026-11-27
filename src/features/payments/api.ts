import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { RECEIPT_SOURCES, RECEIPT_STATUSES, type ReceiptStatus } from '@/types/books';

/**
 * One row of "Payments to confirm" (the Accounts queue): buyer side only, never the seller. A payment Sales entered
 * belongs to an order; a payment Accounts added by hand (money that came with no order) has none: it is an
 * "advance" on the buyer's account until it is used.
 */
const paymentRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(RECEIPT_STATUSES),
  source: z.enum(RECEIPT_SOURCES),
  note: z.string().nullable(),
  amountPaise: z.number(),
  /** A confirmed payment's money not yet spent on an order. */
  unspentPaise: z.number(),
  utr: z.string(),
  receivedOn: z.string(),
  bankName: z.string(),
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  salesOrder: z
    .object({
      id: z.string(),
      number: z.string(),
      totalPaise: z.number(),
      paidPaise: z.number(),
    })
    .nullable(),
  enteredBy: z.string(),
  enteredAt: z.string(),
  /** Maker ≠ checker: the person who entered it may not confirm or reject it. */
  enteredByMe: z.boolean(),
  tradeId: z.string().nullable(),
  /** Sent back with every press of a Sales-entered payment (the engine's version check). */
  tradeVersion: z.number().nullable(),
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
  /** Only confirmed payments with money left (advances). */
  unused?: true;
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

/** The same engine action as "Confirm payment" on the deal card. A hand-added payment needs no version. */
export async function confirmPayment(row: PaymentRow) {
  const { data } = await apiClient.post<unknown>(`/payments/${row.id}/confirm`, {
    version: row.tradeVersion ?? undefined,
  });
  return oneSchema.parse(data).payment;
}

export async function rejectPayment(row: PaymentRow, note: string) {
  const { data } = await apiClient.post<unknown>(`/payments/${row.id}/reject`, {
    version: row.tradeVersion ?? undefined,
    note,
  });
  return oneSchema.parse(data).payment;
}

/** Money that reached the bank with no order. It waits for a different person to confirm it. */
export interface HandPaymentInput {
  bankLedgerId: string;
  buyerId: string;
  utr: string;
  amountPaise: number;
  receivedOn: string;
  note?: string | undefined;
}

export async function addHandPayment(input: HandPaymentInput) {
  const { data } = await apiClient.post<unknown>('/payments/hand', input);
  return oneSchema.parse(data).payment;
}

/** Buyers who hold an advance, and their orders that are waiting for payment (with the trade's version). */
const advanceBuyerSchema = z.object({
  buyer: z.object({ id: z.string(), number: z.string(), firmName: z.string() }),
  advancePaise: z.number(),
  payments: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      utr: z.string(),
      receivedOn: z.string(),
      unspentPaise: z.number(),
    }),
  ),
  orders: z.array(
    z.object({
      salesOrderId: z.string(),
      number: z.string(),
      tradeId: z.string(),
      tradeVersion: z.number(),
      totalPaise: z.number(),
      paidPaise: z.number(),
      duePaise: z.number(),
    }),
  ),
});
export type AdvanceBuyer = z.infer<typeof advanceBuyerSchema>;
export type AdvanceOrder = AdvanceBuyer['orders'][number];

export async function listAdvances(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/payments/advances', { signal });
  return z.object({ buyers: z.array(advanceBuyerSchema) }).parse(data).buyers;
}

const usedSchema = z.object({
  trade: z.object({ id: z.string(), buyerStage: z.string(), version: z.number() }),
  order: z.object({
    id: z.string(),
    number: z.string(),
    status: z.string(),
    totalPaise: z.number(),
    paidPaise: z.number(),
  }),
});

/** The same engine action as "Use the buyer's advance" on the deal card: oldest money first, never more than is due. */
export async function spendAdvance(order: AdvanceOrder) {
  const { data } = await apiClient.post<unknown>('/payments/advances/use', {
    tradeId: order.tradeId,
    version: order.tradeVersion,
  });
  return usedSchema.parse(data);
}

/** Buyers the Accounts desk may add a payment for (name and number only: no rates, no seller). */
const buyerChoiceSchema = z.object({ id: z.string(), number: z.string(), firmName: z.string() });
export type BuyerChoice = z.infer<typeof buyerChoiceSchema>;

export async function searchBuyers(q: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/payments/buyers', { params: { q }, signal });
  return z.object({ buyers: z.array(buyerChoiceSchema) }).parse(data).buyers;
}
