import { Fragment, useCallback, useState } from 'react';
import { listSalesOrders, type SalesOrderRow } from '../../api/sales';
import { allocateUpcomingReceipt } from '../../api/payment';
import { proxyAcceptPromotion, proxyRejectPromotion } from '../../api/proxy';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const WARN_STATES = new Set(['awaiting_payment', 'payment_verifying']);
const BAD_STATES = new Set(['cancelled', 'supply_failed', 'disputed']);
const GOOD_STATES = new Set(['delivered', 'closed']);

function stateTone(state: string): BadgeTone {
  if (WARN_STATES.has(state)) return 'warn';
  if (BAD_STATES.has(state)) return 'bad';
  if (GOOD_STATES.has(state)) return 'good';
  return 'neutral';
}

function formatMoney(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

/** Live vs closed orders, plus the two things that need Sales' hand: claims and promoted-fallback decisions. */
export function SalesOrdersPage() {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState<'live' | 'closed'>('live');
  const [promotionRowId, setPromotionRowId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const loader = useCallback(
    () => callApi((token) => listSalesOrders(token, { tab })),
    [callApi, tab],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader, tab]);

  async function handleApplyClaim(row: SalesOrderRow): Promise<void> {
    if (!row.upcomingReceiptId) return;
    setApplyingId(row.soId);
    try {
      await callApi((token) => allocateUpcomingReceipt(token, row.upcomingReceiptId!, [row.soId]));
      show('Applied — Accounts can post it now');
      retry();
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
      <Card>
        <div className="mb-4 flex gap-2">
          <Button
            variant={tab === 'live' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTab('live')}
          >
            Live
          </Button>
          <Button
            variant={tab === 'closed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTab('closed')}
          >
            Closed
          </Button>
        </div>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing here.">
          {(rows: SalesOrderRow[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Buyer</Th>
                  <Th>Goods</Th>
                  <Th numeric>Value</Th>
                  <Th>State</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.soId}>
                    <tr>
                      <Td className="font-medium">
                        {row.soNo}
                        <div className="font-mono text-xs text-slate-500">…{row.soId.slice(-6)}</div>
                      </Td>
                      <Td>{row.buyerFirm}</Td>
                      <Td>{row.productDisplay}</Td>
                      <Td numeric>{formatMoney(row.totalPaise)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={stateTone(row.state)}>{row.state}</Badge>
                          {row.claimNeedsApplying && <Badge tone="warn">he says he paid</Badge>}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-2">
                          {row.claimNeedsApplying && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={applyingId === row.soId}
                              onClick={() => void handleApplyClaim(row)}
                            >
                              Apply this claim
                            </Button>
                          )}
                          {row.state === 'promotion_offered' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setPromotionRowId(promotionRowId === row.soId ? null : row.soId)
                              }
                            >
                              Decide promotion
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                    {promotionRowId === row.soId && (
                      <tr>
                        <td colSpan={6} className="border-b border-slate-100 bg-slate-50 px-3 py-3">
                          <PromotionForm
                            row={row}
                            onDone={() => {
                              setPromotionRowId(null);
                              retry();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

/**
 * Relocated from the old flat `SalesDeskPage`'s "Promoted-fallback decision
 * (WF-11)" sub-form — now inline under the order's own row, with
 * `soId`/`buyerCounterpartyId` pre-filled from the row instead of typed
 * free-text.
 */
function PromotionForm({ row, onDone }: { row: SalesOrderRow; onDone: () => void }) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [callNote, setCallNote] = useState('');
  const [submitting, setSubmitting] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    setSubmitting('accept');
    setError(null);
    try {
      await callApi((token) =>
        proxyAcceptPromotion(token, row.soId, {
          buyerCounterpartyId: row.buyerCounterpartyId,
          callNote,
        }),
      );
      show('Accepted the replacement seller.');
      onDone();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReject(): Promise<void> {
    setSubmitting('reject');
    setError(null);
    try {
      await callApi((token) =>
        proxyRejectPromotion(token, row.soId, {
          buyerCounterpartyId: row.buyerCounterpartyId,
          callNote,
        }),
      );
      show('Declined — refunded on the next run.');
      onDone();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Promoted-fallback decision (WF-11)</h3>
      <Textarea
        id={`promo-note-${row.soId}`}
        label="Call note"
        required
        value={callNote}
        onChange={(e) => setCallNote(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!callNote || submitting !== null}
          loading={submitting === 'accept'}
          onClick={() => void handleAccept()}
        >
          Accept replacement
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!callNote || submitting !== null}
          loading={submitting === 'reject'}
          onClick={() => void handleReject()}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
