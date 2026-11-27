import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { VOUCHER_TYPES, type VoucherType } from '@/types/books';

/**
 * Vouchers: the entries the books are made of. Posted by the system (a sale, a purchase, a payment, a receipt) or
 * from an approved journal. A voucher is never edited; a wrong one is undone by a reversal, its exact mirror.
 */
const voucherSchema = z.object({
  id: z.string(),
  number: z.string(),
  type: z.enum(VOUCHER_TYPES),
  date: z.string(),
  narration: z.string(),
  totalPaise: z.number(),
  source: z.object({ type: z.string(), number: z.string().nullable() }),
  postedBy: z.string().nullable(),
  postedAt: z.string(),
  /** The number of the reversal that undid it, or null. */
  reversedBy: z.string().nullable(),
  canReverse: z.boolean(),
  /** In plain words, why a voucher cannot be reversed from this screen (null when it can). */
  cannotReverseBecause: z.string().nullable(),
});
export type VoucherRow = z.infer<typeof voucherSchema>;

const voucherDetailSchema = voucherSchema.extend({
  lines: z.array(z.object({ ledgerName: z.string(), drPaise: z.number(), crPaise: z.number() })),
});
export type VoucherDetail = z.infer<typeof voucherDetailSchema>;

export interface VoucherListParams {
  type: VoucherType | '';
  from: string;
  to: string;
  q: string;
  page: number;
  pageSize: number;
}

export async function listVouchers(params: VoucherListParams, signal?: AbortSignal) {
  const { type, from, to, q, page, pageSize } = params;
  const { data } = await apiClient.get<unknown>('/vouchers', {
    params: {
      q,
      page,
      pageSize,
      ...(type ? { type } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
    signal,
  });
  return z
    .object({
      vouchers: z.array(voucherSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

export async function getVoucher(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/vouchers/${id}`, { signal });
  return z.object({ voucher: voucherDetailSchema }).parse(data).voucher;
}

/** The reversal is dated today and mirrors every line of the original. */
export async function reverseVoucher(id: string, reason: string) {
  const { data } = await apiClient.post<unknown>(`/vouchers/${id}/reverse`, { reason });
  return z.object({ reversal: voucherDetailSchema, voucher: voucherDetailSchema }).parse(data)
    .reversal;
}
