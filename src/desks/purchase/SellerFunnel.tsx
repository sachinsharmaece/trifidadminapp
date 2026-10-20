import { useCallback, useState, type ReactNode } from 'react';
import {
  getSellerStageFunnel,
  postDispatchChase,
  type DispatchQueueItem,
  type SellerAfterDispatchRow,
  type SellerFunnelDto,
  type SellerFunnelKey,
  type SellerFunnelStage,
  type SellerPileRow,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DropdownCard } from '../../components/DropdownCard';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { timeAgo, useMinuteClock } from '../../lib/timeAgo';
import {
  ApplyInspectionButton,
  AskHoldButton,
  ConfirmHoldButton,
  HandToDispatchButton,
  RecordInvoiceButton,
  SellerDispatchedButton,
} from './StageActions';
import { PileDecisionForm } from './PileDecisionForm';

type SectionId = Exclude<SellerFunnelKey, 'approved' | 'carries' | 'on_board'> | 'funnel';

const ANCHOR = 'seller-section';

// Which section a joint's row opens. Approved, carries and on-the-board have their own cards
// further down this page, so those rows stay static.
const STAGE_SECTION: Partial<Record<SellerFunnelKey, SectionId>> = {
  quoted: 'quoted',
  confirmations: 'confirmations',
  stock: 'stock',
  po: 'po',
  billed: 'billed',
  dispatch: 'dispatch',
  received: 'received',
  paid: 'paid',
};

const STAGE_HINT: Record<SellerFunnelKey, string> = {
  approved: 'He is an approved seller.',
  carries: 'Products on his catalogue.',
  on_board: 'His live listing lines with stock on the board.',
  quoted: 'His live quotes on buyers’ asks.',
  confirmations: 'Buyer demand piled on his listing, waiting for his answer.',
  stock: 'Confirmed orders the buyer has not paid for — he holds the stock meanwhile.',
  po: 'Paid and released — waiting for him to bill the goods.',
  billed: 'His invoice and e-way bill are on record, not yet handed to Dispatch.',
  dispatch: 'Handed over, or on the way to Indore.',
  received: 'Reached Indore — dock inspection and his bill.',
  paid: 'Done with him: paid out.',
};

const LEAK_TEXT: Partial<Record<SellerFunnelKey, string>> = {
  quoted: 'not yet quoted',
  confirmations: 'past the window',
  stock: 'hold not secured',
  po: 'over a day, no invoice',
  dispatch: 'dispatch missed',
};

/** One seller's own run through the Purchase desk, stage by stage — the same stages as the tabs. */
export function SellerFunnel({
  sellerId,
  refreshKey = 0,
}: {
  sellerId: string;
  /** Changing it reloads the funnel — for a change made elsewhere on the page. */
  refreshKey?: number;
}) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSellerStageFunnel(token, sellerId)),
    // `refreshKey` is not read inside, but a new loader is what makes the data reload.
    [callApi, sellerId, refreshKey],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  // The funnel starts open (it is the summary); every section starts closed.
  const [open, setOpen] = useState<ReadonlySet<SectionId>>(new Set(['funnel']));

  const toggle = (id: SectionId): void =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // From a funnel row: always open, never close, then bring the section into view.
  const openSection = (id: SectionId): void => {
    setOpen((current) => new Set(current).add(id));
    document.getElementById(`${ANCHOR}-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };
  const props = (id: SectionId) => ({
    id,
    anchorPrefix: ANCHOR,
    open: open.has(id),
    onToggle: toggle,
  });

  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(data: SellerFunnelDto) => (
        <div className="flex flex-col gap-6">
          <DropdownCard {...props('funnel')} title="Funnel">
            <FunnelList stages={data.funnel} onOpenSection={openSection} />
          </DropdownCard>
          <Sections data={data} props={props} reload={retry} />
        </div>
      )}
    </AsyncBoundary>
  );
}

function FunnelList({
  stages,
  onOpenSection,
}: {
  stages: SellerFunnelStage[];
  onOpenSection: (id: SectionId) => void;
}) {
  const nextIndex = stages.findIndex((s) => !s.reached);
  return (
    <ol className="flex flex-col">
      {stages.map((stage, index) => {
        const section = STAGE_SECTION[stage.key];
        const leak = stage.leakCount ?? 0;
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
                {leak > 0 && (
                  <Badge tone="bad">
                    {leak} {LEAK_TEXT[stage.key] ?? 'stuck'}
                  </Badge>
                )}
                {index === nextIndex && <Badge tone="warn">Next</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{STAGE_HINT[stage.key]}</p>
            </div>
            <div
              className={`shrink-0 text-right text-xl font-semibold ${stage.reached ? 'text-slate-900' : 'text-slate-400'}`}
            >
              {stage.count ?? 'Yes'}
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
  );
}

function Sections({
  data,
  props,
  reload,
}: {
  data: SellerFunnelDto;
  props: (id: SectionId) => {
    id: SectionId;
    anchorPrefix: string;
    open: boolean;
    onToggle: (id: SectionId) => void;
  };
  reload: () => void;
}) {
  const now = useMinuteClock();
  const { stages } = data;
  const countOf = (key: SellerFunnelKey): number =>
    data.funnel.find((s) => s.key === key)?.count ?? 0;
  const empty = (text: string) => <p className="text-sm text-slate-500">{text}</p>;

  return (
    <>
      <DropdownCard {...props('quoted')} title="Quoted" count={countOf('quoted')}>
        {stages.quoted.length === 0 ? (
          empty('He has no live quote on any ask.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ask</Th>
                <Th numeric>Asked</Th>
                <Th numeric>He offered</Th>
                <Th>Given</Th>
                <Th>Held until</Th>
              </tr>
            </thead>
            <tbody>
              {stages.quoted.map((q) => (
                <tr key={q.quoteId}>
                  <Td>
                    <div className="font-medium text-slate-900">
                      {q.brand}
                      {q.packLabel ? ` · ${q.packLabel}` : ''}
                    </div>
                    <div className="text-xs text-slate-500">{q.technical}</div>
                  </Td>
                  <Td numeric>{q.boxesAsked}</Td>
                  <Td numeric>{q.boxesOffered}</Td>
                  <Td>
                    <span title={new Date(q.givenAt).toLocaleString()}>
                      {timeAgo(q.givenAt, now)}
                    </span>
                  </Td>
                  <Td>{new Date(q.heldUntil).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {stages.quoted.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Next is the buyer’s decision — Sales confirms for him. To quote on more asks, use “Open
            demand he could serve” below.
          </p>
        )}
      </DropdownCard>

      <DropdownCard {...props('confirmations')} title="Confirmations" count={countOf('confirmations')}>
        {stages.confirmations.length === 0 ? (
          empty('Nothing is waiting on his decision.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Goods</Th>
                <Th numeric>Boxes</Th>
                <Th numeric>Buyers</Th>
                <Th>Piled</Th>
                <Th>Answer by</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {stages.confirmations.map((p) => (
                <PileRow key={p.pileId} pile={p} now={now} onDecided={reload} />
              ))}
            </tbody>
          </Table>
        )}
      </DropdownCard>

      <DropdownCard {...props('stock')} title="Stock" count={countOf('stock')}>
        {stages.stock.length === 0 ? (
          empty('No order of his is waiting on a buyer’s payment.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Goods</Th>
                <Th>Buyer pays by</Th>
                <Th>Hold</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {stages.stock.map((item) => (
                <tr key={item.soId}>
                  <Td className="font-mono">{item.soNo}</Td>
                  <Td>
                    {item.brand} {item.packLabel} · {item.boxes} boxes
                  </Td>
                  <Td>{new Date(item.payDeadline).toLocaleString()}</Td>
                  <Td>
                    {item.hold === 'not_asked' && <Badge tone="warn">not asked</Badge>}
                    {item.hold === 'asked' && <Badge tone="neutral">asked — waiting on him</Badge>}
                    {item.hold === 'confirmed' && <Badge tone="good">he is holding it</Badge>}
                    {item.hold === 'lapsed' && <Badge tone="bad">hold ran out</Badge>}
                    {item.holdConfirmedAt && (
                      <div className="mt-1 text-xs text-slate-500">
                        Confirmed {timeAgo(item.holdConfirmedAt, now)}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1">
                      {item.hold === 'asked' && <ConfirmHoldButton item={item} onDone={reload} />}
                      <AskHoldButton item={item} onDone={reload} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {stages.stock.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Next is the buyer’s payment — Sales or Accounts records it, and the PO is released then.
          </p>
        )}
      </DropdownCard>

      <DropdownCard {...props('po')} title="PO" count={countOf('po')}>
        {stages.po.length === 0 ? (
          empty('No PO of his is waiting on his bill.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Goods</Th>
                <Th>Released</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {stages.po.map((po) => (
                <tr key={po.poId}>
                  <Td className="font-mono">{po.poNo}</Td>
                  <Td>
                    {po.brand} {po.packLabel} · {po.boxes} boxes
                  </Td>
                  <Td>
                    <span title={new Date(po.releasedAt).toLocaleString()}>
                      {timeAgo(po.releasedAt, now)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <RecordInvoiceButton po={po} onDone={reload} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DropdownCard>

      <DropdownCard {...props('billed')} title="Billed" count={countOf('billed')}>
        {stages.billed.length === 0 ? (
          empty('Nothing billed is waiting to move on.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Goods</Th>
                <Th>Invoice</Th>
                <Th>E-way bill</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {stages.billed.map((po) => (
                <tr key={po.poId}>
                  <Td className="font-mono">{po.poNo}</Td>
                  <Td>
                    {po.brand} {po.packLabel} · {po.boxes} boxes
                  </Td>
                  <Td className="font-mono">{po.invoiceNo}</Td>
                  <Td className="font-mono">{po.ewayNo}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <HandToDispatchButton po={po} onDone={reload} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DropdownCard>

      <DropdownCard {...props('dispatch')} title="Dispatch" count={countOf('dispatch')}>
        {stages.dispatch.length === 0 ? (
          empty('Nothing of his is waiting to leave or on the road.')
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Goods</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {stages.dispatch.map((d) => (
                <DispatchRow key={d.poId} item={d} onChased={reload} />
              ))}
            </tbody>
          </Table>
        )}
      </DropdownCard>

      <DropdownCard {...props('received')} title="At Indore" count={countOf('received')}>
        <AfterDispatchTable
          rows={stages.received}
          empty="Nothing of his is at Indore right now."
          now={now}
          onDone={reload}
        />
      </DropdownCard>

      <DropdownCard {...props('paid')} title="Paid" count={countOf('paid')}>
        <AfterDispatchTable rows={stages.paid} empty="Nothing has been paid out to him yet." now={now} />
      </DropdownCard>
    </>
  );
}

/** A pile on his listing, with the confirm / requote / decline form opening under it. */
function PileRow({
  pile,
  now,
  onDecided,
}: {
  pile: SellerPileRow;
  now: number;
  onDecided: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <Td>
          {pile.brand} {pile.packLabel}
        </Td>
        <Td numeric>{pile.boxes}</Td>
        <Td numeric>{pile.buyers}</Td>
        <Td>
          <span title={new Date(pile.openedAt).toLocaleString()}>{timeAgo(pile.openedAt, now)}</span>
        </Td>
        <Td>
          {pile.chaseLeftHours < 0 ? (
            <Badge tone="bad">{Math.round(-pile.chaseLeftHours)}h over</Badge>
          ) : (
            <Badge tone="warn">{Math.round(pile.chaseLeftHours)}h left</Badge>
          )}
        </Td>
        <Td>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
              {open ? 'Close' : 'Answer'}
            </Button>
          </div>
        </Td>
      </tr>
      {open && (
        <tr>
          <Td colSpan={6}>
            <PileDecisionForm
              pileId={pile.pileId}
              sellerCounterpartyId={pile.sellerCounterpartyId}
              boxes={pile.boxes}
              onDecided={onDecided}
            />
          </Td>
        </tr>
      )}
    </>
  );
}

function DispatchRow({ item, onChased }: { item: DispatchQueueItem; onChased: () => void }) {
  const { callApi } = useAuth();
  const [chased, setChased] = useState(false);
  let status: ReactNode;
  if (item.bucket === 'in_transit') {
    status = (
      <span className="text-sm text-slate-600">
        On the way
        {item.daysInTransit !== null ? ` · ${item.daysInTransit} days out` : ''}
      </span>
    );
  } else if (item.sameDayMiss || item.noDispatch48h) {
    status = <Badge tone="bad">{item.noDispatch48h ? '48h line passed' : 'same-day missed'}</Badge>;
  } else {
    status = <Badge tone="warn">due today</Badge>;
  }
  return (
    <tr>
      <Td className="font-mono">
        {item.poNo}
        {!item.invoiceRecorded && (
          <span className="ml-2 font-sans">
            <Badge tone="warn">no invoice on record</Badge>
          </span>
        )}
      </Td>
      <Td>
        {item.brand} {item.packLabel} · {item.boxes} boxes
      </Td>
      <Td>{status}</Td>
      <Td>
        {item.bucket === 'in_transit' ? (
          <div className="text-right text-xs text-slate-500">Waiting on the dock to receive it</div>
        ) : (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void callApi((token) => postDispatchChase(token, item.poId)).then(() => {
                  setChased(true);
                  onChased();
                })
              }
            >
              {chased ? 'Chased' : 'Chase'}
            </Button>
            <SellerDispatchedButton item={item} onDone={onChased} />
          </div>
        )}
      </Td>
    </tr>
  );
}

function AfterDispatchTable({
  rows,
  empty,
  now,
  onDone,
}: {
  rows: SellerAfterDispatchRow[];
  empty: string;
  now: number;
  /** When given, the column of next steps (Apply inspection) appears. */
  onDone?: () => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>PO</Th>
          <Th>Goods</Th>
          <Th>State</Th>
          {onDone && <Th />}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.poId}>
            <Td className="font-mono">{r.poNo}</Td>
            <Td>
              {r.brand} {r.packLabel} · {r.boxes} boxes
            </Td>
            <Td>
              <Badge tone="neutral">{r.state.replace(/_/g, ' ')}</Badge>
              <div className="mt-1 text-xs text-slate-500" title={new Date(r.updatedAt).toLocaleString()}>
                {r.receivedAt ? `Received ${timeAgo(r.receivedAt, now)}` : `Updated ${timeAgo(r.updatedAt, now)}`}
              </div>
            </Td>
            {onDone && (
              <Td>
                <div className="flex justify-end text-xs text-slate-500">
                  {r.inspection === 'recorded' && <ApplyInspectionButton row={r} onDone={onDone} />}
                  {r.inspection === 'none' && 'Waiting on the dock’s inspection'}
                  {r.inspection === 'applied' && 'Inspection applied'}
                </div>
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
