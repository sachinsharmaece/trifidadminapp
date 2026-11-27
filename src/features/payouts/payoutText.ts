import { formatRupees } from '@/utils/format';
import type { PayoutFacts } from './api';

/** A seller's payment in one line, for the PO page and the seller side of the deal card. */
export function sellerPayoutText(payout: PayoutFacts): string {
  if (payout.status === 'PAID') {
    const freight =
      payout.freightPaise > 0 ? ` (after ${formatRupees(payout.freightPaise)} freight)` : '';
    return `Paid ${formatRupees(payout.amountPaise)}${freight} on ${payout.paidOn ?? ''} · UTR ${payout.utr ?? ''} · ${payout.batchNumber}`;
  }
  const net = formatRupees(payout.amountPaise);
  return payout.status === 'PROOF_PENDING'
    ? `${net} released in ${payout.batchNumber}: waiting for the bank proof`
    : `${net} in ${payout.batchNumber}: waiting for release`;
}

/** The label/value row for the seller's payment. Nothing until the goods are checked. */
export function sellerPayoutRows(
  payout: PayoutFacts | null | undefined,
  checked: boolean,
): [string, string][] {
  if (payout) return [['Payment to the seller', sellerPayoutText(payout)]];
  return checked ? [['Payment to the seller', 'Not in a payout batch yet']] : [];
}
