import type { z } from 'zod';
import { Badge } from '@/components/atoms/Badge';
import {
  FREIGHT_TERM_LABELS,
  OUTCOME_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from '@/types/dock';
import { formatDateTime, formatRupees } from '@/utils/format';
import type { dockFactsShape } from './api';

type DockFacts = { [K in keyof typeof dockFactsShape]: z.infer<(typeof dockFactsShape)[K]> };

/** How the goods were sent, in one line: "Transport: VRL Logistics, LR 4471 (26 Nov)". */
export function leg1Text(
  leg1: Pick<
    NonNullable<DockFacts['leg1']>,
    | 'mode'
    | 'transporter'
    | 'lrNumber'
    | 'lrDate'
    | 'busDetails'
    | 'driverName'
    | 'driverMobile'
    | 'note'
  >,
): string {
  if (leg1.mode === 'TRANSPORT') {
    return `Transport: ${leg1.transporter ?? ''}, LR ${leg1.lrNumber ?? ''}${leg1.lrDate ? ` (${leg1.lrDate})` : ''}`;
  }
  if (leg1.mode === 'BUS') {
    const driver = [leg1.driverName, leg1.driverMobile].filter(Boolean).join(', ');
    return `Bus: ${leg1.busDetails ?? ''}${driver ? `; driver ${driver}` : ''}`;
  }
  return `From a depot${leg1.note ? `: ${leg1.note}` : ''}`;
}

const STATUS_TONES: Record<
  PurchaseOrderStatus,
  'neutral' | 'info' | 'success' | 'warning' | 'danger'
> = {
  RAISED: 'neutral',
  DISPATCHED: 'info',
  ARRIVED: 'warning',
  CHECKED: 'success',
  REJECTED: 'danger',
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{PURCHASE_ORDER_STATUS_LABELS[status]}</Badge>;
}

/**
 * A PO's steps after Gate A, as label/value rows: dispatch (leg 1), the seller's bill, arrival at the dock and
 * the check. Seller side only: it shows the seller's money (freight, bill, accepted value).
 */
export function purchaseOrderProgressRows(
  po: DockFacts & { lines: { boxes: number }[] },
): [string, string][] {
  const ordered = po.lines.reduce((sum, line) => sum + line.boxes, 0);
  const rows: [string, string][] = [];
  if (po.leg1) {
    const freight =
      po.leg1.freightTerms === 'TO_PAY' && po.leg1.freightPaise
        ? `${FREIGHT_TERM_LABELS.TO_PAY}: ${formatRupees(po.leg1.freightPaise)}`
        : FREIGHT_TERM_LABELS[po.leg1.freightTerms];
    rows.push(
      ['Dispatched', `${po.leg1.dispatchedOn} · ${leg1Text(po.leg1)}`],
      ['Freight', freight],
    );
  }
  rows.push([
    'Seller bill',
    po.sellerBill
      ? `${po.sellerBill.number} · ${formatRupees(po.sellerBill.amountPaise)} · ${po.sellerBill.billDate}`
      : 'Not yet',
  ]);
  if (po.arrival) {
    rows.push([
      'Arrived',
      `${formatDateTime(po.arrival.arrivedAt)} · ${po.arrival.boxesCounted} of ${ordered} boxes counted${po.arrival.billWithGoods ? ' · bill came with the goods' : ''}`,
    ]);
  }
  if (po.outcome && po.inspectedAt) {
    rows.push(
      [
        'Checked',
        `${formatDateTime(po.inspectedAt)} · ${OUTCOME_LABELS[po.outcome]} · ${po.acceptedBoxes ?? 0} of ${ordered} accepted`,
      ],
      ['Owed to the seller', formatRupees(po.acceptedValuePaise ?? 0)],
    );
  }
  return rows;
}
