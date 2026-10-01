import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalesPools, type PoolCommitmentRow, type PoolRow } from '../../api/sales';
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

/** One card per pool — the fill bar and party list each need room a table row can't give them. */
export function SalesPoolsPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => callApi((token) => getSalesPools(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Pools</h1>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No pools open right now.">
        {(pools: PoolRow[]) => (
          <div className="flex flex-col gap-4">
            {pools.map((pool) => (
              <Card
                key={pool.poolId}
                title={
                  <span>
                    {pool.brand || `SKU …${pool.skuId.slice(-6)}`}
                    {pool.packLabel && <span className="text-slate-500"> · {pool.packLabel}</span>}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {poolConditionLabel(pool)}
                    </span>
                  </span>
                }
                actions={<Badge tone={statusTone(pool.status)}>{pool.status}</Badge>}
              >
                <div className="flex flex-col gap-3">
                  <FillBar committedQty={pool.committedQty} moq={pool.moq} />
                  <p className="text-sm text-slate-500">
                    {pool.committedQty} of {pool.moq} committed · {pool.bindingQty} binding ·{' '}
                    {pool.commitments.length} parties
                    {pool.payDeadline && (
                      <> · pay by {new Date(pool.payDeadline).toLocaleDateString()}</>
                    )}
                  </p>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Party</Th>
                        <Th numeric>Qty</Th>
                        <Th>Commitment</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {pool.commitments.map((c) => (
                        <tr key={c.poolCommitmentId} className={c.withdrawnAt ? 'opacity-60' : ''}>
                          <Td className="font-medium">
                            {c.buyerFirm}
                            <div className="text-xs text-slate-500">{c.ownerName ?? 'queue'}</div>
                          </Td>
                          <Td numeric>{c.qty}</Td>
                          <Td>{commitmentBadge(c)}</Td>
                          <Td>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/sales/pools/${pool.poolId}`)}
                            >
                              Open pool
                            </Button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            ))}
            <p className="text-sm text-slate-500">
              A pool belongs to a condition set on a SKU, not to one listing — open any pool for the
              parties inside it, since a total with no names behind it cannot be chased.
            </p>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
