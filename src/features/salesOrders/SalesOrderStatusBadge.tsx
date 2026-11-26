import { Badge } from '@/components/atoms/Badge';
import { SALES_ORDER_STATUS_LABELS, type SalesOrderStatus } from '@/types/salesOrder';

const TONES = {
  AWAITING_PAYMENT: 'warning',
  PAID: 'success',
  BILLED: 'info',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
} as const;

/** "Awaiting payment" (amber), "Paid" and "Delivered" (green), "Billed" and "Dispatched" (blue), "Cancelled" (grey). */
export function SalesOrderStatusBadge({ status }: { status: SalesOrderStatus }) {
  return <Badge tone={TONES[status]}>{SALES_ORDER_STATUS_LABELS[status]}</Badge>;
}
