import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiChevronDown,FiPhoneIncoming, FiPhoneOutgoing } from 'react-icons/fi';
import {
  getSalesBuyerFile,
  type BuyerFileDto,
  type BuyerFunnelStage,
  type SalesOrderRow,
} from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { BoardForHimBody } from './SalesCallWorkspacePage';
import {
  CancelAskButton,
  CancelOrderButton,
  ConfirmRateButton,
  DispatchButton,
  GiveRateButton,
  MarkBilledButton,
  MarkDeliveredButton,
  MarkPaidButton,
  paidWaitingOn,
} from './BuyerStageActions';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatRupees } from '../../lib/labels';
import { timeAgo, useMinuteClock } from '../../lib/timeAgo';

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

/** Buyer file — `/staff/sales/buyers/:id`. */
export function SalesBuyerFilePage() {
  const { buyerId = '' } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSalesBuyerFile(token, buyerId)),
    [callApi, buyerId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  // The funnel starts open (it is the summary); every other section starts closed.
  const [openSections, setOpenSections] = useState<ReadonlySet<SectionId>>(new Set(['funnel']));
  const now = useMinuteClock();

  const toggleSection = (id: SectionId): void =>
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // From a funnel row: always open, never close, then bring the section into view.
  const openSection = (id: SectionId): void => {
    setOpenSections((current) => new Set(current).add(id));
    document.getElementById(`buyer-section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };
  const sectionProps = (id: SectionId) => ({
    id,
    open: openSections.has(id),
    onToggle: toggleSection,
  });

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/buyers')}>
        Buyers
      </Button>
      <AsyncBoundary state={state} onRetry={retry}>
        {(file: BuyerFileDto) => (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{file.firm}</h2>
                <p className="text-sm text-slate-500">
                  <span className="font-mono">{file.mobile}</span>
                  {file.gstin && (
                    <>
                      {' · '}
                      <span className="font-mono">{file.gstin}</span>
                    </>
                  )}
                  {file.tehsil && ` · ${file.tehsil}`}
                </p>
              </div>
              <div className="flex gap-2">
                {/* SalesCallWorkspacePage doesn't take a direction query param yet — both
                    buttons land on the same route; the workspace's own direction toggle
                    decides in-place, matching the mockup's two-button intent without a
                    route change. */}
                <Button
                  variant="secondary"
                  icon={<FiPhoneIncoming />}
                  onClick={() => navigate(`/sales/call/${buyerId}`)}
                >
                  Log an incoming call
                </Button>
                <Button
                  variant="secondary"
                  icon={<FiPhoneOutgoing />}
                  onClick={() => navigate(`/sales/call/${buyerId}`)}
                >
                  Log an outgoing call
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Orders" value={String(file.orders.length)} />
              <Kpi label="Products he buys" value={String(file.productHistory.length)} />
              <Kpi label="Rate tier" value={file.tier ?? '—'} />
              <Kpi label="Rate views" value={String(file.rateViews)} />
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-6">
                <DropdownCard {...sectionProps('funnel')} title="Funnel">
                  <BuyerFunnelCard stages={file.funnel} onOpenSection={openSection} />
                </DropdownCard>

                <DropdownCard {...sectionProps('board')} title="On the board for him">
                  <BoardForHimBody
                    buyerId={buyerId}
                    counterpartyId={file.counterpartyId}
                    onChanged={retry}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('asked')}
                  title="He asked"
                  count={file.openAsks.length}
                >
                  {file.openAsks.length === 0 ? (
                    <p className="text-sm text-slate-500">No ask is waiting on a rate.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Product</Th>
                          <Th numeric>Qty</Th>
                          <Th numeric>He hopes to pay</Th>
                          <Th>State</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {file.openAsks.map((a) => (
                          <tr key={a.askId}>
                            <Td>
                              <div className="font-medium text-slate-900">
                                {a.brand}
                                {a.packLabel ? ` · ${a.packLabel}` : ''}
                              </div>
                              <div className="text-xs text-slate-500">{a.technical}</div>
                            </Td>
                            <Td numeric>{a.qty}</Td>
                            <Td numeric>
                              {a.expectedRatePaise != null ? formatRupees(a.expectedRatePaise) : '—'}
                            </Td>
                            <Td>
                              <Badge tone="neutral">{a.state}</Badge>
                              <div
                                className="mt-1 text-xs text-slate-500"
                                title={new Date(a.askedAt).toLocaleString()}
                              >
                                Asked {timeAgo(a.askedAt, now)}
                              </div>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap justify-end gap-1">
                                {a.state === 'open' && (
                                  <GiveRateButton ask={a} buyerId={buyerId} onDone={retry} />
                                )}
                                {(a.state === 'open' || a.state === 'quoted') && (
                                  <CancelAskButton
                                    askId={a.askId}
                                    counterpartyId={file.counterpartyId}
                                    label="Cancel"
                                    onDone={retry}
                                  />
                                )}
                                {a.productId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/sales/products/${a.productId}`)}
                                  >
                                    Product
                                  </Button>
                                )}
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('rate')}
                  title="Rate given"
                  count={file.liveQuotes.length}
                >
                  {file.liveQuotes.length === 0 ? (
                    <p className="text-sm text-slate-500">No live rate on any of his asks.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Product</Th>
                          <Th numeric>Rate</Th>
                          <Th numeric>Qty</Th>
                          <Th numeric>Days to Indore</Th>
                          <Th>Held until</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {file.liveQuotes.map((q) => (
                          <tr key={q.quoteId}>
                            <Td>
                              {q.brand}
                              {q.packLabel ? ` · ${q.packLabel}` : ''}
                            </Td>
                            <Td numeric>{formatRupees(q.ratePaiseForIndore)}</Td>
                            <Td numeric>{q.qtyAvailable}</Td>
                            <Td numeric>{q.daysToIndore}</Td>
                            <Td>
                              <div>{new Date(q.bindingUntil).toLocaleString()}</div>
                              <div
                                className="text-xs text-slate-500"
                                title={`Given ${new Date(q.givenAt).toLocaleString()}`}
                              >
                                Given {timeAgo(q.givenAt, now)}
                              </div>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap justify-end gap-1">
                                <ConfirmRateButton
                                  quote={q}
                                  counterpartyId={file.counterpartyId}
                                  onDone={retry}
                                />
                                <CancelAskButton
                                  askId={q.askId}
                                  counterpartyId={file.counterpartyId}
                                  label="Walk away"
                                  onDone={retry}
                                />
                                {q.productId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/sales/products/${q.productId}`)}
                                  >
                                    Product
                                  </Button>
                                )}
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('pending')}
                  title="Payment pending"
                  count={file.ordersByStage.paymentPending.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.paymentPending}
                    empty="No order of his is waiting on payment."
                    showDeadline
                    since={(o) => ({ verb: 'Raised', at: o.placedAt })}
                    renderActions={(o) => (
                      <>
                        <MarkPaidButton order={o} onDone={retry} />
                        <CancelOrderButton order={o} onDone={retry} />
                      </>
                    )}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('paid')}
                  title="Paid"
                  count={file.ordersByStage.paid.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.paid}
                    empty="No paid order is in the chain right now."
                    since={(o) => ({
                      verb: o.state === 'po_released' ? 'Paid' : 'Updated',
                      at: o.updatedAt,
                    })}
                    renderActions={(o) =>
                      o.state === 'inspected' ? (
                        <MarkBilledButton order={o} onDone={retry} />
                      ) : (
                        <>
                          <span className="text-xs text-slate-500">{paidWaitingOn(o.state)}</span>
                          {/* INTERIM — remove with sales:skip_to_billed once the dock records these. */}
                          <MarkBilledButton order={o} onDone={retry} skipSteps />
                        </>
                      )
                    }
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('billed')}
                  title="Billed"
                  count={file.ordersByStage.billed.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.billed}
                    empty="No order of his is billed and waiting to leave Indore."
                    since={(o) => ({ verb: 'Billed', at: o.updatedAt })}
                    renderActions={(o) => <DispatchButton order={o} onDone={retry} />}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('dispatched')}
                  title="Dispatch"
                  count={file.ordersByStage.dispatched.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.dispatched}
                    empty="Nothing of his is on the road from Indore."
                    since={(o) => ({ verb: 'Dispatched', at: o.updatedAt })}
                    renderActions={(o) => <MarkDeliveredButton order={o} onDone={retry} />}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('delivered')}
                  title="Delivered"
                  count={file.ordersByStage.delivered.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.delivered}
                    empty="Nothing delivered to him yet."
                    since={(o) => ({ verb: 'Delivered', at: o.updatedAt })}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('other')}
                  title="Other orders"
                  count={file.ordersByStage.other.length}
                >
                  <OrdersTable
                    orders={file.ordersByStage.other}
                    empty="No orders outside the steps above."
                    since={(o) => ({ verb: 'Updated', at: o.updatedAt })}
                  />
                </DropdownCard>

                <DropdownCard
                  {...sectionProps('calls')}
                  title="Call history"
                  count={file.callLogs.filter((c) => c.kind === 'call').length}
                >
                  {(() => {
                    const calls = file.callLogs.filter((c) => c.kind === 'call');
                    return calls.length === 0 ? (
                      <p className="text-sm text-slate-500">No calls logged yet.</p>
                    ) : (
                      <Table>
                        <thead>
                          <tr>
                            <Th>When</Th>
                            <Th>Way</Th>
                            <Th>By</Th>
                            <Th>Outcome</Th>
                            <Th>Note</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {calls.map((c) => (
                            <tr key={c.callLogId}>
                              <Td>{new Date(c.at).toLocaleString()}</Td>
                              <Td>
                                {c.direction === 'in' ? '↓' : c.direction === 'out' ? '↑' : '—'}
                              </Td>
                              <Td>{c.employeeName}</Td>
                              <Td>{c.outcome ? humanize(c.outcome) : '—'}</Td>
                              <Td>
                                {c.note}
                                {c.producedAskId && (
                                  <span className="ml-2">
                                    <Badge tone="neutral" variant="chip">
                                      produced an ask
                                    </Badge>
                                  </span>
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    );
                  })()}
                </DropdownCard>
              </div>

              <div className="flex flex-col gap-6">
                <Card title="Owner">
                  {file.ownerName ? (
                    <p className="text-sm text-slate-700">{file.ownerName}</p>
                  ) : (
                    <div>
                      <Badge tone="warn">queue</Badge>
                      <p className="mt-2 text-xs text-slate-500">
                        He joins a book automatically on his first order.
                      </p>
                    </div>
                  )}
                </Card>

                <Card title="Promised">
                  {(() => {
                    const promised = file.callLogs.filter(
                      (c) => c.promiseDueAt && !c.promiseFulfilledAt,
                    );
                    return promised.length === 0 ? (
                      <p className="text-sm text-slate-500">Nothing promised and open.</p>
                    ) : (
                      <ul className="flex flex-col gap-3 text-sm">
                        {promised.map((c) => (
                          <li key={c.callLogId} className="rounded-md border border-slate-200 p-2">
                            <div className="text-xs font-semibold text-slate-500">
                              due {new Date(c.promiseDueAt!).toLocaleDateString()}
                            </div>
                            <p className="text-slate-700">{c.note}</p>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </Card>

                <DropdownCard
                  {...sectionProps('notes')}
                  title="Notes"
                  count={file.callLogs.filter((c) => c.kind === 'note' && !c.promiseDueAt).length}
                >
                  {(() => {
                    const notes = file.callLogs.filter((c) => c.kind === 'note' && !c.promiseDueAt);
                    return notes.length === 0 ? (
                      <p className="text-sm text-slate-500">No standalone notes.</p>
                    ) : (
                      <ul className="flex flex-col gap-3 text-sm">
                        {notes.map((c) => (
                          <li key={c.callLogId} className="rounded-md border border-slate-200 p-2">
                            <div className="text-xs font-semibold text-slate-500">
                              {new Date(c.at).toLocaleDateString()}
                            </div>
                            <p className="text-slate-700">{c.note}</p>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </DropdownCard>

                <Card title="Update requests">
                  {(() => {
                    const updates = file.callLogs.filter((c) => c.kind === 'update_request');
                    return updates.length === 0 ? (
                      <p className="text-sm text-slate-500">No update requests logged.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <ul className="flex flex-col gap-3 text-sm">
                          {updates.map((c) => (
                            <li
                              key={c.callLogId}
                              className="rounded-md border border-slate-200 p-2"
                            >
                              <div className="text-xs font-semibold text-slate-500">
                                {c.updateKind ? humanize(c.updateKind) : '—'}
                              </div>
                              <p className="text-slate-700">→ {c.updateValue}</p>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-slate-500">
                          Logged only, never applied automatically — a re-classification is a
                          request, not a change.
                        </p>
                      </div>
                    );
                  })()}
                </Card>
              </div>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

type SectionId =
  | 'funnel'
  | 'board'
  | 'asked'
  | 'rate'
  | 'pending'
  | 'paid'
  | 'billed'
  | 'dispatched'
  | 'delivered'
  | 'other'
  | 'calls'
  | 'notes';

// Where a funnel stage's records live on this page. Registered, classified, viewing and
// ordered again have no section of their own, so those rows stay static.
const STAGE_SECTION: Partial<Record<BuyerFunnelStage['key'], SectionId>> = {
  asked: 'asked',
  rate_held: 'rate',
  took_it: 'pending',
  paid: 'paid',
  billed: 'billed',
  dispatched: 'dispatched',
  delivered: 'delivered',
};

/** One group of his orders; `showDeadline` adds the pay-by column for the unpaid ones. */
function OrdersTable({
  orders,
  empty,
  showDeadline = false,
  since,
  renderActions,
}: {
  orders: SalesOrderRow[];
  empty: string;
  showDeadline?: boolean;
  /** The small "Paid 15 minutes ago" line under the state — which verb and which time. */
  since?: (order: SalesOrderRow) => { verb: string; at: string };

  /** Stage buttons for one order; the column only exists when this is given. */
  renderActions?: (order: SalesOrderRow) => ReactNode;
}) {
  const now = useMinuteClock();
  if (orders.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>SO</Th>
          <Th>Product</Th>
          <Th numeric>Total</Th>
          {showDeadline && <Th>Pay by</Th>}
          <Th>State</Th>
          {renderActions && <Th />}
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.soId}>
            <Td>{o.soNo}</Td>
            <Td>{o.productDisplay}</Td>
            <Td numeric>₹{(o.totalPaise / 100).toFixed(2)}</Td>
            {showDeadline && <Td>{new Date(o.payDeadline).toLocaleString()}</Td>}
            <Td>
              <div className="flex flex-wrap items-center gap-1">
                <Badge tone="neutral">{humanize(o.state)}</Badge>
                {o.claimNeedsApplying && <Badge tone="warn">he says he paid</Badge>}
              </div>
              {since && (
                <div
                  className="mt-1 text-xs text-slate-500"
                  title={new Date(since(o).at).toLocaleString()}
                >
                  {since(o).verb} {timeAgo(since(o).at, now)}
                </div>
              )}
            </Td>
            {renderActions && (
              <Td>
                <div className="flex flex-wrap justify-end gap-1">{renderActions(o)}</div>
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

const STAGE_HINT: Record<BuyerFunnelStage['key'], string> = {
  registered: 'He is an approved buyer.',
  classified: 'A desk has set his tier and trader status (BR-044).',
  viewing: 'Times he has looked at a rate.',
  asked: 'His asks still waiting on a rate.',
  rate_held: 'Live quotes on his asks — a rate he is holding right now.',
  took_it: 'His orders awaiting payment or with payment being verified.',
  paid: 'His orders paid in full, between PO release and the Marg bill (leg 1, dock, inspection).',
  billed: 'His orders billed in Marg and waiting to leave Indore on leg 2.',
  dispatched: 'His orders that have left Indore on leg 2 — inside his 7-day window.',
  delivered: 'His orders delivered or closed.',
  ordered_again: 'He has placed more than one order.',
};

/** A card whose body folds away under its title; closed until opened. */
function DropdownCard({
  id,
  open,
  onToggle,
  title,
  count,
  children,
}: {
  id: SectionId;
  open: boolean;
  onToggle: (id: SectionId) => void;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section id={`buyer-section-${id}`} className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <h2 className="text-base font-semibold text-slate-900">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-normal text-slate-500">({count})</span>
          )}
        </h2>
        <FiChevronDown
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

/** This buyer's own run through the Funnel tab's eleven joints. */
function BuyerFunnelCard({
  stages,
  onOpenSection,
}: {
  stages: BuyerFunnelStage[];
  onOpenSection: (id: SectionId) => void;
}) {
  const nextIndex = stages.findIndex((s) => !s.reached);
  return (
    <>
      <ol className="flex flex-col">
        {stages.map((stage, index) => {
          const section = STAGE_SECTION[stage.key];
          const showLeak = !!stage.leakCount && stage.leakCount > 0;
          const value = stage.count ?? (stage.reached ? 'Yes' : 'No');
          const row = (
            <div className="flex items-start gap-4">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  stage.reached
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={`text-sm font-semibold ${stage.reached ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    {stage.label}
                  </h3>
                  {showLeak && <Badge tone="bad">{stage.leakCount} past SLA</Badge>}
                  {index === nextIndex && <Badge tone="warn">Next</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{STAGE_HINT[stage.key]}</p>
              </div>
              <div
                className={`shrink-0 text-right text-xl font-semibold ${stage.reached ? 'text-slate-900' : 'text-slate-400'}`}
              >
                {value}
              </div>
            </div>
          );
          return (
            <li key={stage.key} className="border-t border-slate-100 first:border-t-0">
              {section ? (
                <button
                  type="button"
                  onClick={() => onOpenSection(section)}
                  className="w-full py-3 text-left transition hover:bg-slate-50"
                >
                  {row}
                </button>
              ) : (
                <div className="py-3">{row}</div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
