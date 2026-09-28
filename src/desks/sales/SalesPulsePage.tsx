import { useCallback } from 'react';
import { getMarketPulse, getRetention, type RetentionCohort } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

/** Market pulse (BR-278) and retention (BR-281). */
export function SalesPulsePage() {
  return (
    <div className="flex flex-col gap-6">
      <PulseSection />
      <RetentionSection />
    </div>
  );
}

function PulseSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getMarketPulse(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-4">
      <Card title="The rule, in full">
        <p className="mb-2 text-sm text-slate-500">
          Area × product. An event is an ask or an order. The last 14 days against the 14 before
          them — the only calculation on this desk, on purpose (BR-278).
        </p>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          <strong>rising</strong> now ≥ 5 and now ≥ before × 2 &nbsp;·&nbsp; <strong>falling</strong>{' '}
          now × 2 ≤ before &nbsp;·&nbsp; <strong>steady</strong> otherwise
        </div>
        <p className="mt-3 text-sm text-slate-500">
          <strong className="text-slate-700">The echo rule (BR-279).</strong> Orders arising from
          our own push are excluded before the rule runs — otherwise the desk calls its own noise.
        </p>
      </Card>

      <Card title="Market pulse">
        <p className="mb-4 text-sm text-slate-500">
          A call list, nothing else — it never sets a rate, never changes a tier, never fires a
          message on its own (BR-280).
        </p>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing to report yet.">
          {(items) => {
            const rising = items.filter((i) => i.status !== 'steady');
            return rising.length === 0 ? (
              <p className="text-sm text-slate-500">Everything is steady right now.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Tehsil</Th>
                    <Th>Product</Th>
                    <Th numeric>Last 14d</Th>
                    <Th numeric>14d before</Th>
                    <Th>State</Th>
                  </tr>
                </thead>
                <tbody>
                  {rising.map((item, index) => (
                    <tr key={index}>
                      <Td className="font-mono text-xs">…{item.areaTehsilId.slice(-6)}</Td>
                      <Td className="font-mono text-xs">…{item.productId.slice(-6)}</Td>
                      <Td numeric>{item.now}</Td>
                      <Td numeric>{item.before}</Td>
                      <Td>
                        <Badge tone={item.status === 'rising' ? 'good' : 'bad'}>{item.status}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            );
          }}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

function retentionTone(pct: number): { bar: string; label: string } {
  if (pct < 40) return { bar: 'bg-danger-500', label: 'bad' };
  if (pct < 55) return { bar: 'bg-warning-500', label: 'warn' };
  return { bar: 'bg-brand-500', label: 'good' };
}

function RetentionSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getRetention(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Retention (BR-281)">
      <p className="mb-4 text-sm text-slate-500">
        Of the buyers whose first order fell in a month, how many ordered again within 90 days.
        One cohort, one window, one number per month.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Not enough history yet.">
        {(items: RetentionCohort[]) => (
          <div className="flex flex-col divide-y divide-slate-100 rounded-md border border-slate-200">
            {items.map((item) => {
              const tone = retentionTone(item.retentionPct);
              return (
                <div key={item.month} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-20 shrink-0 text-sm font-semibold text-slate-900">
                    {item.month}
                  </div>
                  <div className="w-28 shrink-0 text-xs text-slate-500">
                    {item.retainedCount} of {item.firstOrderCount} back
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${tone.bar}`}
                      style={{ width: `${Math.min(100, item.retentionPct)}%` }}
                    />
                  </div>
                  <div className="w-12 shrink-0 text-right text-sm font-semibold text-slate-900">
                    {item.retentionPct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}
