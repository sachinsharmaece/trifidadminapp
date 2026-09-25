import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import { getSellerFile, type SellerFileDto } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

export function SellerFilePage() {
  const { id } = useParams<{ id: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => callApi((token) => getSellerFile(token, id!)), [callApi, id]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/purchase/sellers')}>
        Sellers
      </Button>
      <DevNote screen="purchase_seller_file" />
      <AsyncBoundary state={state} onRetry={retry}>
        {(file: SellerFileDto) => (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{file.firm}</h2>
              <p className="text-sm text-slate-500">
                {file.ownerName} · <span className="font-mono">{file.gstin}</span> · licence{' '}
                <span className="font-mono">{file.licenceNo}</span> · since{' '}
                {new Date(file.since).toLocaleDateString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Trust tier" value={file.trustTier} />
              <Kpi label="Supplies" value={String(file.suppliesCompleted)} />
              <Kpi label="Grace left" value={String(file.scorecard.graceRemaining)} />
              <Kpi label="Strikes" value={String(file.scorecard.strikeCount)} />
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-6">
                <Card
                  title="What he sells"
                  actions={
                    <Button
                      size="sm"
                      icon={<FiPlus />}
                      onClick={() => navigate(`/purchase/sellers/${id}/catalogue/new`)}
                    >
                      Add a product he carries
                    </Button>
                  }
                >
                  <p className="mb-3 text-sm text-slate-500">
                    His catalogue — no rate, no territory, never on the buyer board on its own.
                  </p>
                  {file.catalogue.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nothing recorded. Nobody has asked him what he sells.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {file.catalogue.map((c) => (
                        <li key={c.entryId} className="rounded-md border border-slate-200 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {c.brand}
                              {c.productState === 'draft' && (
                                <span className="ml-2">
                                  <Badge tone="warn">draft</Badge>
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500">{c.manufacturerName}</span>
                          </div>
                          <p className="text-xs text-slate-500">{c.technical}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.packsDetailed ? (
                              c.packs.map((p) => (
                                <span
                                  key={p.skuId}
                                  className={`rounded border px-2 py-0.5 text-xs ${
                                    p.listed
                                      ? 'border-success-500 text-success-600'
                                      : 'border-slate-300 text-slate-600'
                                  }`}
                                >
                                  {p.packLabel}
                                  {p.listed ? ` · ${(p.listingRatePaise! / 100).toFixed(2)}` : ''}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs italic text-slate-400">
                                packs not detailed
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card
                  title="On the board"
                  actions={
                    <Button
                      size="sm"
                      icon={<FiPlus />}
                      onClick={() => navigate(`/purchase/sellers/${id}/listing/new`)}
                    >
                      Enter a listing
                    </Button>
                  }
                >
                  {file.listings.length === 0 ? (
                    <p className="text-sm text-slate-500">Nothing of his is on the board.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Pack</Th>
                          <Th>Rate</Th>
                          <Th>Scope</Th>
                          <Th>Origin</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.listings.map((l) => (
                          <tr key={l.lineId}>
                            <Td>{l.packLabel}</Td>
                            <Td>₹{(l.ratePaise / 100).toFixed(2)}</Td>
                            <Td className="text-xs text-slate-500">{l.scopeType}</Td>
                            <Td>
                              {l.deskEntered ? (
                                <div>
                                  <Badge tone="neutral">Desk entered it</Badge>
                                  {l.callNote && (
                                    <p className="mt-1 max-w-xs text-xs italic text-slate-500">
                                      “{l.callNote}”
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge tone="neutral">Seller listed it</Badge>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>

                {file.openDemand.length > 0 && (
                  <Card title="Open demand he could serve">
                    <p className="mb-3 text-sm text-slate-500">
                      Asks on a product already in his catalogue that he hasn&apos;t quoted yet.
                    </p>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Ask</Th>
                          <Th>Boxes</Th>
                          <Th>Open</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.openDemand.map((d) => (
                          <tr key={d.askId}>
                            <Td className="font-mono text-xs">{d.askId.slice(-6)}</Td>
                            <Td>{d.qty}</Td>
                            <Td>
                              {d.ageHours >= 24
                                ? `${Math.floor(d.ageHours / 24)}d`
                                : `${d.ageHours}h`}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                )}

                {(file.openDebits.length > 0 || file.openReturnNotes.length > 0) && (
                  <Card title="Owed back">
                    {file.openDebits.length > 0 && (
                      <Table className="mb-4">
                        <thead>
                          <tr>
                            <Th>Reason</Th>
                            <Th>Amount</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {file.openDebits.map((d) => (
                            <tr key={d.debitId}>
                              <Td>{d.reason}</Td>
                              <Td>₹{(d.amountPaise / 100).toFixed(2)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                    {file.openReturnNotes.length > 0 && (
                      <Table>
                        <thead>
                          <tr>
                            <Th>Return note</Th>
                            <Th>Cases</Th>
                            <Th>Age</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {file.openReturnNotes.map((r) => (
                            <tr key={r.returnNoteId}>
                              <Td className="font-mono text-xs">{r.returnNoteId.slice(-6)}</Td>
                              <Td>{r.cases}</Td>
                              <Td>
                                {r.overdue ? (
                                  <Badge tone="bad">{r.daysOld}d of 30</Badge>
                                ) : (
                                  <Badge tone="warn">{r.daysOld}d of 30</Badge>
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <Card title="Area">
                  <div className="flex flex-wrap gap-1">
                    {file.area.map((a) => (
                      <span
                        key={a.tehsilId}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </Card>
                <Card title="Contact">
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Mobile</dt>
                      <dd className="font-mono">{file.mobile}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Dispatch cut-off</dt>
                      <dd>{file.dispatchCutoffTime}</dd>
                    </div>
                  </dl>
                </Card>
                {file.references.length > 0 && (
                  <Card title="References">
                    <ul className="flex flex-col gap-3 text-sm">
                      {file.references.map((r, i) => (
                        <li key={i}>
                          <strong>{r.firm}</strong>
                          <p className="text-slate-500">“{r.whatTheySaid}”</p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
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
