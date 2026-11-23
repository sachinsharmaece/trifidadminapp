import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { RATE_TIER_LABELS } from '@/types/party';
import { SALES_ORDER_STATUSES, type SalesOrderStatus } from '@/types/salesOrder';

/**
 * Sales orders: read only. The trade engine raises an order when the buyer says yes, and cancels it when he
 * drops it (deal card buttons). The server leaves out the seller and his rate for Sales and Accounts.
 */
const status = z.enum(SALES_ORDER_STATUSES);

const rowSchema = z.object({
  id: z.string(),
  number: z.string(),
  status,
  buyer: z.object({ number: z.string(), firmName: z.string() }),
  item: z.string(),
  totalPaise: z.number(),
  paymentDueAt: z.string(),
  createdAt: z.string(),
});
export type SalesOrderRow = z.infer<typeof rowSchema>;

const listSchema = z.object({
  salesOrders: z.array(rowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

const salesOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  status,
  tradeId: z.string(),
  buyer: z.object({
    id: z.string(),
    number: z.string(),
    firmName: z.string(),
    gstin: z.string().nullable(),
    stateCode: z.string(),
    deliveryLocation: z.string(),
    rateTier: z.enum(Object.keys(RATE_TIER_LABELS) as [keyof typeof RATE_TIER_LABELS]),
    classified: z.boolean(),
  }),
  interState: z.boolean(),
  lines: z.array(
    z.object({
      lineNo: z.number(),
      productName: z.string(),
      packLabel: z.string(),
      unitsPerBox: z.number(),
      hsnCode: z.string(),
      boxes: z.number(),
      expiryMonth: z.string(),
      batchNumber: z.string().nullable(),
      buyerRatePaisePerUnit: z.number(),
      boxValuePaise: z.number(),
      lineTotalPaise: z.number(),
      taxBp: z.number(),
      /** Supervisors only. */
      landedPaisePerUnit: z.number().optional(),
    }),
  ),
  totalPaise: z.number(),
  gst: z.object({
    taxablePaise: z.number(),
    cgstPaise: z.number(),
    sgstPaise: z.number(),
    igstPaise: z.number(),
  }),
  paymentDueAt: z.string(),
  paidPaise: z.number(),
  cancel: z
    .object({ at: z.string(), reasonLabel: z.string(), note: z.string().nullable() })
    .nullable(),
  createdAt: z.string(),
  /** Supervisors only. */
  seller: z
    .object({ id: z.string(), number: z.string(), firmName: z.string() })
    .nullable()
    .optional(),
});
export type SalesOrder = z.infer<typeof salesOrderSchema>;

export interface SalesOrderListParams {
  q: string;
  /** A status, or '' for all. */
  status: SalesOrderStatus | '';
  page: number;
  pageSize: number;
}

export async function listSalesOrders(params: SalesOrderListParams, signal?: AbortSignal) {
  const { status: only, ...rest } = params;
  const { data } = await apiClient.get<unknown>('/sales-orders', {
    params: only ? { ...rest, status: only } : rest,
    signal,
  });
  return listSchema.parse(data);
}

export async function getSalesOrder(id: string, signal?: AbortSignal): Promise<SalesOrder> {
  const { data } = await apiClient.get<unknown>(`/sales-orders/${id}`, { signal });
  return z.object({ salesOrder: salesOrderSchema }).parse(data).salesOrder;
}
