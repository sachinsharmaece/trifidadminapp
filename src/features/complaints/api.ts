import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_OUTCOMES,
  COMPLAINT_STATUSES,
  type ComplaintStatus,
} from '@/types/complaint';
import { REFUND_STATUSES } from '@/types/payouts';

/**
 * Complaints: a buyer says something is wrong in the 7 days after the proof of dispatch (Sales raises it from the
 * deal card) and the Controller decides (also from the deal card, or from the Complaints list). The list is buyer
 * side only: Purchase never sees a complaint.
 */

/** One complaint as the deal card and the sales order show it. */
export const complaintSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(COMPLAINT_STATUSES),
  raisedAtStage: z.enum(['B9_DISPATCH', 'B10_DELIVERED']),
  category: z.enum(COMPLAINT_CATEGORIES),
  reasonLabel: z.string(),
  description: z.string().nullable(),
  boxes: z.number().nullable(),
  raisedAt: z.string(),
  raisedBy: z.string(),
  resolveByAt: z.string(),
  /** Open and past the time the Controller was given. */
  overdue: z.boolean(),
  resolution: z
    .object({
      outcome: z.enum(COMPLAINT_OUTCOMES),
      amountPaise: z.number().nullable(),
      boxes: z.number().nullable(),
      note: z.string(),
      refundNumber: z.string().nullable(),
      refundStatus: z.enum(REFUND_STATUSES).nullable(),
      creditNoteNumber: z.string().nullable(),
      at: z.string(),
      by: z.string(),
    })
    .nullable(),
});
export type Complaint = z.infer<typeof complaintSchema>;

const listRowSchema = complaintSchema.extend({
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  salesOrder: z.object({ id: z.string(), number: z.string() }),
  trade: z.object({ id: z.string(), number: z.string(), version: z.number() }),
});
export type ComplaintRow = z.infer<typeof listRowSchema>;

const listSchema = z.object({
  counts: z.object({ OPEN: z.number(), RESOLVED: z.number() }),
  complaints: z.array(listRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export interface ComplaintListParams {
  status: ComplaintStatus;
  q: string;
  page: number;
  pageSize: number;
}

export async function listComplaints(params: ComplaintListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/complaints', { params, signal });
  return listSchema.parse(data);
}
