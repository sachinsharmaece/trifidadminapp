import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import {
  PAYOUT_BATCH_STATUS_LABELS,
  PAYOUT_BATCH_STATUS_TONES,
  PAYOUT_LINE_STATUS_LABELS,
  PAYOUT_LINE_STATUS_TONES,
  PAYOUT_LINE_TYPE_LABELS,
} from '@/types/payouts';
import { formatDateTime, formatRupees } from '@/utils/format';
import type { PayoutBatch, PayoutLine } from './api';
import { useCancelBatch } from './hooks';
import { ProofForm } from './ProofForm';
import { ReleaseForm } from './ReleaseForm';

interface BatchCardProps {
  batch: PayoutBatch;
  /** Accounts, Founder and Admin: build, cancel and type proofs. The Controller only looks. */
  canWrite: boolean;
  /** Founder and Admin release a batch (and never one they built themselves). */
  canRelease: boolean;
}

function LineAmount({ line }: { line: PayoutLine }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-slate-900">{formatRupees(line.amountPaise)}</span>
      {line.freightPaise > 0 && (
        <span className="block text-xs text-slate-500">
          {formatRupees(line.grossPaise)} less {formatRupees(line.freightPaise)} freight
        </span>
      )}
    </span>
  );
}

/** One batch: its lines with payees and amounts, and the buttons for the step it is at. */
export function BatchCard({ batch, canWrite, canRelease }: BatchCardProps) {
  const cancel = useCancelBatch();
  const [releasing, setReleasing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [proofFor, setProofFor] = useState<string | null>(null);

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{batch.number}</span>
        <Badge tone={PAYOUT_BATCH_STATUS_TONES[batch.status]}>
          {PAYOUT_BATCH_STATUS_LABELS[batch.status]}
        </Badge>
        <span className="text-slate-600">
          {formatRupees(batch.totalPaise)} from {batch.bankName} · built{' '}
          {formatDateTime(batch.createdAt)}
          {batch.releasedAt ? ` · released ${formatDateTime(batch.releasedAt)}` : ''}
        </span>
        {batch.status === 'RELEASED' && (
          <span className="text-xs text-slate-500">
            {batch.paidCount} of {batch.lines.length} paid
          </span>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {batch.lines.map((line) => (
          <li key={line.id} className="space-y-2 py-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Badge tone={line.type === 'PAYOUT' ? 'info' : 'neutral'}>
                {PAYOUT_LINE_TYPE_LABELS[line.type]}
              </Badge>
              <span className="font-medium">{line.reference}</span>
              <span>
                {line.payee.firmName} ({line.payee.number})
              </span>
              <LineAmount line={line} />
              {batch.status !== 'CANCELLED' && (
                <Badge tone={PAYOUT_LINE_STATUS_TONES[line.status]}>
                  {PAYOUT_LINE_STATUS_LABELS[line.status]}
                </Badge>
              )}
              {line.status === 'PAID' && (
                <span className="text-xs text-slate-500">
                  UTR {line.utr} · {line.paidOn}
                  {line.voucherNumber ? ` · ${line.voucherNumber}` : ''}
                </span>
              )}
              {batch.status === 'RELEASED' &&
                line.status === 'PROOF_PENDING' &&
                canWrite &&
                proofFor !== line.id && (
                  <Button size="sm" onClick={() => setProofFor(line.id)}>
                    Add bank proof
                  </Button>
                )}
            </div>
            {proofFor === line.id && (
              <ProofForm batch={batch} line={line} onDone={() => setProofFor(null)} />
            )}
          </li>
        ))}
      </ul>

      {batch.status === 'DRAFT' && (
        <div className="space-y-2">
          <ErrorAlert message={cancel.error?.message} />
          {releasing && <ReleaseForm batch={batch} onDone={() => setReleasing(false)} />}
          {!releasing && (
            <div className="flex flex-wrap items-center gap-2">
              {canRelease && !batch.builtByMe && (
                <Button size="sm" onClick={() => setReleasing(true)}>
                  Release
                </Button>
              )}
              {canRelease && batch.builtByMe && (
                <span className="text-xs text-slate-500">
                  You built this batch, so someone else releases it.
                </span>
              )}
              {!canRelease && (
                <span className="text-xs text-slate-500">
                  Waiting for the Founder or Admin to release it.
                </span>
              )}
              {canWrite && !confirmingCancel && (
                <Button size="sm" variant="secondary" onClick={() => setConfirmingCancel(true)}>
                  Cancel batch
                </Button>
              )}
              {canWrite && confirmingCancel && (
                <>
                  <span className="text-xs text-slate-600">
                    Cancel {batch.number}? Its payments go back to the To pay list.
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(batch, { onSettled: () => setConfirmingCancel(false) })
                    }
                  >
                    Yes, cancel it
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingCancel(false)}>
                    Keep it
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
