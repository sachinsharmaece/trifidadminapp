/** Sales order statuses, as the API uses them (server: shared/enums.ts). */
export const SALES_ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'BILLED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  BILLED: 'Billed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
