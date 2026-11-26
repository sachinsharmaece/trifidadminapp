import { BOOK_WITH_LABELS, TRIP_STATUS_LABELS } from '@/types/dock';
import { formatDateTime, formatRupees } from '@/utils/format';
import type { Accepted, MargBill } from './api';

interface BillingFacts {
  accepted?: Accepted | null;
  margBill: MargBill | null;
  trip: {
    code: string;
    status: keyof typeof TRIP_STATUS_LABELS;
    vehicleNumber: string;
    bookWith: { mode: keyof typeof BOOK_WITH_LABELS; transporter: string | null };
    pod: { ref: string; date: string } | null;
  } | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

/**
 * From the dock check on, as label/value rows (buyer side): what may be billed, the Marg bill, the trip and its
 * POD, and delivery. Used on the deal card and the order page.
 */
export function billingRows(facts: BillingFacts): [string, string][] {
  const rows: [string, string][] = [];
  if (facts.accepted) {
    rows.push([
      'Accepted at the dock',
      `${facts.accepted.acceptedBoxes} boxes · at most ${formatRupees(facts.accepted.expectedPaise)} to bill`,
    ]);
  }
  const bill = facts.margBill;
  rows.push([
    'Marg bill',
    bill
      ? `${bill.invoiceNumber} · ${bill.lines.reduce((sum, line) => sum + line.boxes, 0)} boxes · ${formatRupees(bill.totalPaise)}${bill.shortByPaise > 0 ? ` (${formatRupees(bill.shortByPaise)} lower)` : ''} · ${bill.billDate}${bill.ewayBillNumber ? ` · e-way ${bill.ewayBillNumber}` : ''}`
      : 'Not yet (Accounts)',
  ]);
  if (bill) {
    const trip = facts.trip;
    rows.push([
      'Trip',
      trip
        ? `${trip.code} (${TRIP_STATUS_LABELS[trip.status]}) · ${trip.vehicleNumber} · ${
            trip.bookWith.mode === 'TRANSPORT'
              ? (trip.bookWith.transporter ?? '')
              : BOOK_WITH_LABELS[trip.bookWith.mode]
          }`
        : 'Not on a trip yet (Logistics)',
    ]);
    if (trip?.pod) rows.push(['Proof of dispatch', `${trip.pod.ref} · ${trip.pod.date}`]);
  }
  if (facts.deliveredAt) rows.push(['Delivered', formatDateTime(facts.deliveredAt)]);
  return rows;
}
