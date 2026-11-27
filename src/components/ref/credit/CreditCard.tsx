import { useEffect, useState } from 'react';
import { refGet } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';

export interface CreditCardShape {
  buyerId: string;
  hasLine: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'NONE';
  suspendReason: 'MANUAL' | 'UNUSED' | null;
  limitPaise: number;
  usedPaise: number;
  availablePaise: number;
  usedPct: number;
  days: number;
  blocked: boolean;
  overdueDays: number;
  reference: { id: string; name: string; mobile: string } | null;
}

/**
 * The credit card, copied from the reference (components/credit/CreditCard.tsx). One component and one API call
 * (GET /credit/card) on both the Sales buyer funnel and the Accounts statement: the same numbers everywhere.
 * It never edits anything.
 */
export function CreditCard({ buyerId, refreshKey }: { buyerId: string; refreshKey?: number }) {
  const [card, setCard] = useState<CreditCardShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    refGet<{ card: CreditCardShape }>('/credit/card', { buyerId })
      .then((data) => {
        if (!cancelled) setCard(data.card);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load credit');
      });
    return () => {
      cancelled = true;
    };
  }, [buyerId, refreshKey]);

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>
    );
  }
  if (!card) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-400">
        Loading credit…
      </div>
    );
  }
  if (!card.hasLine) {
    return (
      <div
        className="rounded border border-zinc-200 bg-white p-3 text-sm"
        data-testid="credit-card"
      >
        <p className="font-medium text-zinc-900">Credit line</p>
        <p className="mt-1 text-xs text-zinc-500">No credit limit set.</p>
      </div>
    );
  }
  const statusLabel = card.blocked
    ? `Blocked · overdue ${card.overdueDays} d`
    : card.status === 'SUSPENDED'
      ? `Suspended${card.suspendReason === 'UNUSED' ? ' (unused)' : ' (manual)'}`
      : 'Active';
  const statusClass =
    card.blocked || card.status === 'SUSPENDED'
      ? 'bg-red-100 text-red-700'
      : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="rounded border border-zinc-200 bg-white p-3 text-sm" data-testid="credit-card">
      <div className="flex items-center justify-between">
        <p className="font-medium text-zinc-900">Credit line</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full bg-zinc-900" style={{ width: `${card.usedPct}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-zinc-600">
        <dt>Limit</dt>
        <dd className="text-right font-semibold text-zinc-900">
          {formatPaiseAsINR(card.limitPaise)}
        </dd>
        <dt>Used</dt>
        <dd className="text-right">{formatPaiseAsINR(card.usedPaise)}</dd>
        <dt>Available</dt>
        <dd className="text-right font-semibold text-zinc-900">
          {formatPaiseAsINR(card.availablePaise)}
        </dd>
        <dt>Days</dt>
        <dd className="text-right">{card.days}</dd>
        <dt>Reference</dt>
        <dd className="text-right">{card.reference?.name ?? '—'}</dd>
      </dl>
    </div>
  );
}
