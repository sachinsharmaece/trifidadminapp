import { Badge } from '@/components/atoms/Badge';
import { formatRupees } from '@/utils/format';
import type { Refund } from './api';

/** One refund due to a buyer: the amount, why, and where its payment is (Due, in a batch, or paid with its UTR). */
export function RefundLine({ refund }: { refund: Refund }) {
  const payout = refund.payout;
  return (
    <li className="flex flex-wrap items-center gap-2 py-1">
      <span className="font-medium">{formatRupees(refund.amountPaise)}</span>
      <span className="text-xs text-slate-500">
        {refund.number} · {refund.reason}
      </span>
      {refund.status === 'PAID' ? (
        <Badge tone="success">Paid</Badge>
      ) : (
        <Badge tone="warning">Due</Badge>
      )}
      {payout && (
        <span className="text-xs text-slate-500">
          {payout.status === 'PAID'
            ? `${payout.paidOn ?? ''} · UTR ${payout.utr ?? ''} · ${payout.batchNumber}`
            : payout.status === 'PROOF_PENDING'
              ? `Released in ${payout.batchNumber}: waiting for the bank proof`
              : `In ${payout.batchNumber}: waiting for release`}
        </span>
      )}
    </li>
  );
}
