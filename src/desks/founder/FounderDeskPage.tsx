import { useCallback } from 'react';
import { getFounderOverview } from '../../api/founder';
import { useAuth } from '../../auth/AuthContext';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { Card } from '../../components/ui/Card';
import { useAsyncData } from '../../lib/useAsyncData';
import { FunnelMetricsGrid } from '../purchase/FunnelMetrics';

/**
 * New — M8. The Founder view: read-only and deliberately small. Every figure
 * here is fetched from `GET /founder/overview`, which itself only calls the
 * function that already owns each number (Controller's exception view,
 * Purchase's funnel, the buyer-money-held report) — so this screen can never
 * disagree with the desk that owns a figure. There is nothing on this page
 * that changes anything.
 *
 * Not shown, on purpose: a recovery-exposure figure or a per-seller debit cap.
 * That was a developer recommendation, never a client decision.
 */
export function FounderDeskPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getFounderOverview(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Founder overview</h1>
      <AsyncBoundary state={state} onRetry={retry}>
        {(overview) => (
          <>
            <Card title="Buyer money held against undelivered goods (BR-026)">
              <p className="text-3xl font-semibold text-slate-900">
                {formatRupees(overview.buyerMoneyHeld.heldPaise)}
              </p>
              <p className="mt-2 text-sm text-slate-600">{overview.buyerMoneyHeld.formula}</p>
              <p className="mt-2 text-xs text-slate-500">
                {formatRupees(overview.buyerMoneyHeld.undeliveredOrdersPaise)} in paid, undelivered
                orders + {formatRupees(overview.buyerMoneyHeld.pendingRefundsPaise)} in refunds not
                yet released. As of {new Date(overview.asOf).toLocaleString()}.
              </p>
            </Card>

            <Card title="Every exception, one place (Controller's own view)">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Open disputes" value={overview.exceptions.openDisputes} />
                <Stat
                  label="Transit-damage (unhandled)"
                  value={overview.exceptions.unhandledTransitDamage}
                />
                <Stat label="Return notes overdue" value={overview.exceptions.overdueReturnNotes} />
                <Stat
                  label="Blacklisted w/ pending payables"
                  value={overview.exceptions.blacklistedWithPendingPayables.length}
                />
              </div>
            </Card>

            <Card title="Funnel and leaks (BR-275, Purchase's own measure)">
              <FunnelMetricsGrid report={overview.funnel} />
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

// The API speaks integer paise (money is never a float on the wire); rupees are a display concern.
function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}
