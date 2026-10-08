import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalesFunnel, type SalesFunnelMetric } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

// B-34 — the joints weren't clickable at all. Only wired where a screen
// actually exists to show the records behind that count; `ordered_again` has
// no dedicated Sales-desk list yet, so it stays static rather than linking
// somewhere that wouldn't answer the question a click implies.
const FUNNEL_DESTINATIONS: Partial<Record<SalesFunnelMetric['key'], string>> = {
  registered: '/registrations',
  classified: '/sales/buyers',
  viewing: '/sales/buyers',
  asked: '/sales/funnel/asked',
  rate_held: '/sales/funnel/rate-held',
  took_it: '/sales/orders',
  paid: '/sales/orders',
  delivered: '/sales/orders',
};

function formatValue(metric: SalesFunnelMetric): string {
  if (metric.value == null) return '—';
  if (metric.unit === 'percent') return `${metric.value}%`;
  if (metric.unit === 'hours') return `${metric.value}h`;
  return String(metric.value);
}

/** Nine joints (BR-278-adjacent funnel report) — the ladder from registered to ordered-again. */
export function SalesFunnelPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => callApi((token) => getSalesFunnel(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (report) => report.metrics.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Funnel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nine joints, one leak at each. This desk is measured on leaks closed, not orders placed.
        </p>
      </div>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No funnel data yet.">
        {(report) => (
          <div className="flex flex-col gap-3">
            {report.metrics.map((metric, index) => (
              <FunnelRow
                key={metric.key}
                metric={metric}
                step={index + 1}
                onOpen={
                  FUNNEL_DESTINATIONS[metric.key]
                    ? () => navigate(FUNNEL_DESTINATIONS[metric.key]!)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

function FunnelRow({
  metric,
  step,
  onOpen,
}: {
  metric: SalesFunnelMetric;
  step: number;
  onOpen?: () => void;
}) {
  const showLeak = metric.key === 'asked' && !!metric.leakCount && metric.leakCount > 0;
  return (
    <Card
      className={onOpen ? 'cursor-pointer transition hover:bg-slate-50' : undefined}
      onClick={onOpen}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700">
          {step}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{metric.label}</h3>
            {showLeak && <Badge tone="bad">{metric.leakCount} past SLA</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{metric.formula}</p>
          {metric.numerator != null && metric.denominator != null && (
            <p className="mt-1 text-xs text-slate-400">
              {metric.numerator} of {metric.denominator}
            </p>
          )}
          {metric.caveat && (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-slate-700">
              {metric.caveat}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xl font-semibold text-slate-900">
          {formatValue(metric)}
        </div>
      </div>
    </Card>
  );
}
