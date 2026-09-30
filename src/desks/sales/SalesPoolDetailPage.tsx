import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { getSalesPool, type PoolCommitmentRow, type PoolRow } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { poolConditionLabel } from '../../lib/labels';

function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'reconfirm':
      return 'warn';
    case 'triggered':
      return 'bad';
    case 'converted':
      return 'good';
    case 'reopened':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function commitmentBadge(c: PoolCommitmentRow) {
  if (c.withdrawnAt) return <Badge tone="bad">Withdrawn</Badge>;
  return c.isBinding ? <Badge tone="good">Binding</Badge> : <Badge tone="neutral">Soft</Badge>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function FillBar({ committedQty, moq }: { committedQty: number; moq: number }) {
  const pct = moq > 0 ? Math.round((committedQty / moq) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold text-slate-900">{pct}%</span>
    </div>
  );
}

function noteFor(status: string): string {
  if (status === 'triggered') {
    return 'It triggered on binding quantity, not committed. Every binding party has a payment window running — one non-payer holds up every other buyer and the seller.';
  }
  if (status === 'reconfirm') {
    return 'Every committer has been asked once, and once only. Silence drops him with no strike — losing him now, while the pool can still refill, is far cheaper than losing him at trigger.';
  }
  return 'Soft until re-confirmation. Free to withdraw, and silence costs nothing yet.';
}

/** One pool's parties, in full — the reason to open any pool at all. */
export function SalesPoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(
    () => callApi((token) => getSalesPool(token, poolId!)),
    [callApi, poolId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/pools')}>
        Pools
      </Button>
      <AsyncBoundary state={state} onRetry={retry}>
        {(pool: PoolRow) => (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {pool.brand || `SKU …${pool.skuId.slice(-6)}`}
                {pool.packLabel && ` · ${pool.packLabel}`}
              </h1>
              <p className="text-sm text-slate-500">{poolConditionLabel(pool)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Committed" value={`${pool.committedQty} / ${pool.moq}`} />
              <Kpi label="Binding" value={String(pool.bindingQty)} />
              <Kpi label="State" value={pool.status} />
              <Kpi
                label="Pay deadline"
                value={pool.payDeadline ? new Date(pool.payDeadline).toLocaleString() : '—'}
              />
            </div>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <FillBar committedQty={pool.committedQty} moq={pool.moq} />
                </div>
                <Badge tone={statusTone(pool.status)}>{pool.status}</Badge>
              </div>
            </Card>

            <Card title="Every commitment">
              <Table>
                <thead>
                  <tr>
                    <Th>Party</Th>
                    <Th numeric>Qty</Th>
                    <Th>Commitment</Th>
                    <Th>Reconfirmed</Th>
                    <Th>Paid</Th>
                  </tr>
                </thead>
                <tbody>
                  {pool.commitments.map((c) => {
                    const notPaid =
                      pool.status === 'triggered' && c.isBinding && !c.paidAt && !c.withdrawnAt;
                    return (
                      <tr key={c.poolCommitmentId} className={c.withdrawnAt ? 'opacity-60' : ''}>
                        <Td className="font-medium">
                          {c.buyerFirm}
                          <div className="text-xs text-slate-500">{c.ownerName ?? 'queue'}</div>
                        </Td>
                        <Td numeric>{c.qty}</Td>
                        <Td>{commitmentBadge(c)}</Td>
                        <Td>
                          {c.reconfirmedAt ? new Date(c.reconfirmedAt).toLocaleString() : '—'}
                        </Td>
                        <Td>
                          {notPaid ? (
                            <Badge tone="bad">not paid</Badge>
                          ) : c.paidAt ? (
                            new Date(c.paidAt).toLocaleString()
                          ) : (
                            '—'
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            <p className="text-sm text-slate-500">{noteFor(pool.status)}</p>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
