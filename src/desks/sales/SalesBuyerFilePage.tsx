import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPhoneIncoming, FiPhoneOutgoing } from 'react-icons/fi';
import { getSalesBuyerFile, type BuyerFileDto } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatRupees } from '../../lib/labels';

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
                <Card title="What he buys">
                  {file.productHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">He has never ordered.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Product</Th>
                          <Th numeric>Orders</Th>
                          <Th numeric>Last paid</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.productHistory.map((p) => (
                          <tr
                            key={p.productId}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => navigate(`/sales/products/${p.productId}`)}
                          >
                            <Td>{p.brand}</Td>
                            <Td numeric>{p.orderCount}</Td>
                            <Td numeric>
                              {p.lastPaidRatePaise === null
                                ? '—'
                                : formatRupees(p.lastPaidRatePaise)}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>

                <Card title="He asked">
                  {file.openAsks.length === 0 ? (
                    <p className="text-sm text-slate-500">No open asks.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th numeric>Qty</Th>
                          <Th>State</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {file.openAsks.map((a) => (
                          <tr key={a.askId}>
                            <Td numeric>{a.qty}</Td>
                            <Td>
                              <Badge tone="neutral">{a.state}</Badge>
                            </Td>
                            <Td>
                              {a.productId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/sales/products/${a.productId}`)}
                                >
                                  Product
                                </Button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>

                <Card title="Call history">
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
                </Card>

                <Card title="Orders">
                  {file.orders.length === 0 ? (
                    <p className="text-sm text-slate-500">No orders yet.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>SO</Th>
                          <Th>Product</Th>
                          <Th numeric>Total</Th>
                          <Th>State</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.orders.map((o) => (
                          <tr key={o.soId}>
                            <Td>{o.soNo}</Td>
                            <Td>{o.productDisplay}</Td>
                            <Td numeric>₹{(o.totalPaise / 100).toFixed(2)}</Td>
                            <Td>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge tone="neutral">{o.state}</Badge>
                                {o.claimNeedsApplying && <Badge tone="warn">he says he paid</Badge>}
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>
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

                <Card title="Notes">
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
                </Card>

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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
