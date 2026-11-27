import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import {
  PAYOUT_BATCH_STATUSES,
  PAYOUT_LINE_STATUSES,
  PAYOUT_LINE_TYPES,
  REFUND_STATUSES,
  type PayoutBatchStatus,
} from '@/types/payouts';

/**
 * Payouts: money going out of our bank, for sellers (the goods the dock accepted) and for refunds due to buyers.
 * A batch names sellers and buyers, so only Accounts, the Controller, Founder and Admin read it. Accounts builds
 * it and types the bank proofs; Founder and Admin release it (after re-typing the password, and never their own).
 */

/** Where a seller's payment or a refund is, as the deal card and the order pages show it. */
export const payoutFactsSchema = z.object({
  batchNumber: z.string(),
  status: z.enum(PAYOUT_LINE_STATUSES),
  grossPaise: z.number(),
  freightPaise: z.number(),
  amountPaise: z.number(),
  utr: z.string().nullable(),
  paidOn: z.string().nullable(),
});
export type PayoutFacts = z.infer<typeof payoutFactsSchema>;

/** A refund due to a buyer (buyer side), and whether a payout batch has paid it. */
export const refundSchema = z.object({
  id: z.string(),
  number: z.string(),
  reason: z.string(),
  boxes: z.number(),
  amountPaise: z.number(),
  status: z.enum(REFUND_STATUSES),
  createdAt: z.string(),
  payout: payoutFactsSchema.nullable(),
});
export type Refund = z.infer<typeof refundSchema>;

const payableOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  seller: z.object({ number: z.string(), firmName: z.string() }),
  acceptedBoxes: z.number(),
  acceptedValuePaise: z.number(),
  freightPaise: z.number(),
  netPaise: z.number(),
  sellerBill: z
    .object({ number: z.string(), amountPaise: z.number(), billDate: z.string() })
    .nullable(),
  inspectedAt: z.string().nullable(),
  /** Why it cannot go in a batch yet; null when it can. */
  waiting: z.string().nullable(),
});
export type PayableOrder = z.infer<typeof payableOrderSchema>;

const payableRefundSchema = z.object({
  id: z.string(),
  number: z.string(),
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  reason: z.string(),
  boxes: z.number(),
  amountPaise: z.number(),
  createdAt: z.string(),
});
export type PayableRefund = z.infer<typeof payableRefundSchema>;

const lineSchema = z.object({
  id: z.string(),
  type: z.enum(PAYOUT_LINE_TYPES),
  reference: z.string(),
  payee: z.object({ number: z.string(), firmName: z.string() }),
  grossPaise: z.number(),
  freightPaise: z.number(),
  amountPaise: z.number(),
  status: z.enum(PAYOUT_LINE_STATUSES),
  utr: z.string().nullable(),
  paidOn: z.string().nullable(),
  voucherNumber: z.string().nullable(),
});
export type PayoutLine = z.infer<typeof lineSchema>;

const batchSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(PAYOUT_BATCH_STATUSES),
  version: z.number(),
  bankName: z.string(),
  totalPaise: z.number(),
  createdAt: z.string(),
  releasedAt: z.string().nullable(),
  /** Maker ≠ checker: the person who built a batch may not release it. */
  builtByMe: z.boolean(),
  paidCount: z.number(),
  lines: z.array(lineSchema),
});
export type PayoutBatch = z.infer<typeof batchSchema>;

const oneSchema = z.object({ batch: batchSchema });

export async function getPayables(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/payouts/payables', { signal });
  return z
    .object({
      purchaseOrders: z.array(payableOrderSchema),
      refunds: z.array(payableRefundSchema),
    })
    .parse(data);
}

export interface BatchListParams {
  status: PayoutBatchStatus;
  q: string;
  page: number;
  pageSize: number;
}

export async function listBatches(params: BatchListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/payout-batches', { params, signal });
  return z
    .object({
      batches: z.array(batchSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

export interface BuildBatchInput {
  bankLedgerId: string;
  purchaseOrderIds: string[];
  refundIds: string[];
}

export async function buildBatch(input: BuildBatchInput) {
  const { data } = await apiClient.post<unknown>('/payout-batches', input);
  return oneSchema.parse(data).batch;
}

/** Founder or Admin, after the password check (step-up). */
export async function releaseBatch(batch: PayoutBatch) {
  const { data } = await apiClient.post<unknown>(`/payout-batches/${batch.id}/release`, {
    version: batch.version,
  });
  return oneSchema.parse(data).batch;
}

export async function cancelBatch(batch: PayoutBatch) {
  const { data } = await apiClient.post<unknown>(`/payout-batches/${batch.id}/cancel`, {
    version: batch.version,
  });
  return oneSchema.parse(data).batch;
}

export interface ProofInput {
  utr: string;
  paidOn: string;
}

/** The bank's UTR for one line. Only now is the line paid (a seller's line also closes the deal). */
export async function addProof(batch: PayoutBatch, line: PayoutLine, input: ProofInput) {
  const { data } = await apiClient.post<unknown>(
    `/payout-batches/${batch.id}/lines/${line.id}/proof`,
    input,
  );
  return oneSchema.parse(data).batch;
}
