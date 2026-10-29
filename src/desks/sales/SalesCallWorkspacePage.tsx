import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiChevronDown, FiPhoneCall, FiPlus } from 'react-icons/fi';
import { proxyRaiseAsks } from '../../api/proxy';
import { HeWantsItButton } from './BuyerStageActions';
import { CallLineFields } from './CallLineFields';
import {
  getSalesBuyerFile,
  getSalesBoardForBuyer,
  createCallLog,
  listCallLogsForBuyer,
  type BuyerFileDto,
  type BoardForBuyerProduct,
  type CallLogDto,
  type CallLogUpdateKind,
} from '../../api/sales';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { deliveryBandLabel, expiryBandLabel, formatRupees, moqBandLabel } from '../../lib/labels';
import { formatDateTime } from '../../lib/dates';

const UPDATE_KINDS: CallLogUpdateKind[] = [
  'mobile',
  'delivery_address',
  'dealerships',
  'reclassify_request',
  'gst_details',
];

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function humanizeCapitalized(value: string): string {
  const spaced = humanize(value);
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The call workspace for one specific buyer — reached from his buyer file
 * (`/sales/call/:buyerId`). `LogBuyerCallSection` is relocated from the old
 * flat `SalesDeskPage`; this pass adds buyer-header context, the "on the board for him"
 * panel, a call-outcome form + history, and an update-request form around
 * them.
 *
 * Direction: neither existing section tracks a call direction (raise-ask
 * and accept/decline-fill take no direction field), and the route
 * (`call/:buyerId`) takes no direction query param either — so the two
 * "Log an incoming/outgoing call" buttons on the buyer file page both land
 * here the same way. This page owns one local `direction` toggle, used only
 * by the new "what the call produced" form below.
 */
export function SalesCallWorkspacePage() {
  const { buyerId = '' } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  // Bumped after any call action, so the call history reloads. (29 Oct — the "Advance an ask on
  // a call" card is gone: rates are given and confirmed from the buyer file's sections.)
  const [callsVersion, setCallsVersion] = useState(0);
  const onCallLogged = useCallback(() => setCallsVersion((v) => v + 1), []);

  const fileLoader = useCallback(
    () => callApi((token) => getSalesBuyerFile(token, buyerId)),
    [callApi, buyerId],
  );
  const { state: fileState, retry: retryFile } = useAsyncData(fileLoader, () => false, [
    fileLoader,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        icon={<FiArrowLeft />}
        onClick={() => navigate(`/sales/buyers/${buyerId}`)}
      >
        Buyer file
      </Button>

      <AsyncBoundary state={fileState} onRetry={retryFile}>
        {(file: BuyerFileDto) => (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{file.firm}</h2>
              <p className="text-sm text-slate-500">
                <span className="font-mono">{file.mobile}</span>
                {file.tehsil && ` · ${file.tehsil}`}
                {file.tier && ` · ${file.tier}`}
              </p>
            </div>
            <BoardForHimSection
              buyerId={buyerId}
              counterpartyId={file.counterpartyId}
              direction={direction}
              onAskRaised={onCallLogged}
            />

            <DirectionToggle direction={direction} onChange={setDirection} />

            <LogBuyerCallSection
              buyerCounterpartyId={file.counterpartyId}
              direction={direction}
              onLogged={onCallLogged}
            />

            <CallHistorySection buyerId={buyerId} refreshKey={callsVersion} />
            <UpdateRequestSection buyerId={buyerId} />
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

function DirectionToggle({
  direction,
  onChange,
}: {
  direction: 'in' | 'out';
  onChange: (direction: 'in' | 'out') => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        This call is
      </span>
      <Button
        size="sm"
        variant={direction === 'in' ? 'primary' : 'secondary'}
        onClick={() => onChange('in')}
      >
        ↓ Incoming
      </Button>
      <Button
        size="sm"
        variant={direction === 'out' ? 'primary' : 'secondary'}
        onClick={() => onChange('out')}
      >
        ↑ Outgoing
      </Button>
    </div>
  );
}

/**
 * "On the board for him" — everything available for him to buy, which is what
 * reaches his tehsil (client item 16). It is never his order history: a buyer
 * who has never ordered sees the same board as one who orders every week.
 */
function BoardForHimSection({
  buyerId,
  counterpartyId,
  direction,
  onAskRaised,
}: {
  buyerId: string;
  counterpartyId: string;
  direction: 'in' | 'out';
  onAskRaised: () => void;
}) {
  return (
    <Card title="On the board for him">
      <BoardForHimBody
        buyerId={buyerId}
        counterpartyId={counterpartyId}
        direction={direction}
        onChanged={onAskRaised}
      />
    </Card>
  );
}

/**
 * The board's contents without a card around them, so a page can wrap it its own way.
 * "He wants it" puts this buyer on that listed offer — it then shows under Waiting on the seller
 * (29 Oct; it used to raise an ask, which sent a listed product to Purchase → Demand) — and
 * `onChanged` lets the page refetch.
 */
export function BoardForHimBody({
  buyerId,
  counterpartyId,
  direction,
  onChanged,
}: {
  buyerId: string;
  counterpartyId: string;
  /** Incoming/Outgoing on the call page; the buyer file has no call in progress. */
  direction?: 'in' | 'out';
  onChanged?: () => void;
}) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSalesBoardForBuyer(token, buyerId)),
    [callApi, buyerId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary
      state={state}
      onRetry={retry}
      emptyMessage="Nothing on the board reaches his tehsil right now."
    >
      {(details: BoardForBuyerProduct[]) => (
        <div className="flex flex-col gap-5">
          {details.map((detail) => (
            <BoardProductBlock
              key={detail.productId}
              counterpartyId={counterpartyId}
              direction={direction}
              onChanged={onChanged}
              detail={detail}
              startOpen={details.length === 1}
            />
          ))}
        </div>
      )}
    </AsyncBoundary>
  );
}

/**
 * One product on his board. 29 Oct — its rates fold under the product name, which says how many
 * there are and the lowest, so a long board reads as a short list; it starts closed unless it is
 * the only product.
 */
function BoardProductBlock({
  counterpartyId,
  direction,
  onChanged,
  detail,
  startOpen = false,
}: {
  counterpartyId: string;
  direction?: 'in' | 'out';
  onChanged?: () => void;
  detail: BoardForBuyerProduct;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const count = detail.ladder.length;
  const rates = detail.ladder.flatMap((l) => (l.ratePaise != null ? [l.ratePaise] : []));
  const lowest = rates.length > 0 ? Math.min(...rates) : null;
  const summary =
    count === 0
      ? 'No rates on the board'
      : `${count} ${count === 1 ? 'rate' : 'rates'} available` +
        (lowest != null ? ` · from ${formatRupees(lowest)}` : '');

  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={count > 0 ? open : undefined}
        disabled={count === 0}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">{detail.brand}</span>
          <span className="block text-xs text-slate-500">{detail.technicalName}</span>
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          {summary}
          {count > 0 && (
            <FiChevronDown
              className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          )}
        </span>
      </button>
      {count === 0 || !open ? null : (
        <ul className="mt-2 flex flex-col gap-2">
          {detail.ladder.map((line) => (
            <li
              key={line.listingLineId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {line.ratePaise != null ? formatRupees(line.ratePaise) : 'no rate'}
                </span>
                {line.packLabel && <span className="text-xs text-slate-500">{line.packLabel}</span>}
                <Badge tone="neutral" variant="chip">
                  {expiryBandLabel(line.expiryBand)}
                </Badge>
                <Badge tone="neutral" variant="chip">
                  {moqBandLabel(line.moqBand)}
                </Badge>
                <Badge tone="neutral" variant="chip">
                  {deliveryBandLabel(line.deliveryBand)}
                </Badge>
                <span className="text-xs text-slate-500">qty {line.qty}</span>
              </div>
              <HeWantsItButton
                line={line}
                counterpartyId={counterpartyId}
                direction={direction}
                onDone={() => onChanged?.()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * This buyer's call history. 29 Oct — the "What the call produced" form above it is gone: every
 * call action on this page (He wants it, Log a buyer call) already writes its own row here.
 */
function CallHistorySection({
  buyerId,
  refreshKey = 0,
}: {
  buyerId: string;
  /** Changes after a call action elsewhere on the page, so the history reloads. */
  refreshKey?: number;
}) {
  const { callApi } = useAuth();
  const historyLoader = useCallback(
    () => callApi((token) => listCallLogsForBuyer(token, buyerId)),
    [callApi, buyerId, refreshKey],
  );
  const { state: historyState, retry: retryHistory } = useAsyncData(
    historyLoader,
    (items) => items.length === 0,
    [historyLoader],
  );

  return (
    <Card title="Call history">
      <AsyncBoundary
        state={historyState}
        onRetry={retryHistory}
        emptyMessage="No calls logged yet."
      >
        {(items: CallLogDto[]) => (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Way</Th>
                <Th>Outcome</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.callLogId}>
                  <Td>{formatDateTime(c.at)}</Td>
                  <Td>{c.direction === 'in' ? '↓' : c.direction === 'out' ? '↑' : '—'}</Td>
                  <Td>{c.outcome ? humanize(c.outcome) : '—'}</Td>
                  <Td>{c.note}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function UpdateRequestSection({ buyerId }: { buyerId: string }) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [updateKind, setUpdateKind] = useState<CallLogUpdateKind>(UPDATE_KINDS[0]);
  const [updateValue, setUpdateValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        createCallLog(token, { buyerId, kind: 'update_request', updateKind, updateValue, note }),
      );
      setUpdateValue('');
      setNote('');
      show('Update request logged.');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not log this update.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Record an update">
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Select
          id="ur-kind"
          label="What changed"
          value={updateKind}
          onChange={(e) => setUpdateKind(e.target.value as CallLogUpdateKind)}
        >
          {UPDATE_KINDS.map((k) => (
            <option key={k} value={k}>
              {humanizeCapitalized(k)}
            </option>
          ))}
        </Select>
        <Input
          id="ur-value"
          label="New value"
          value={updateValue}
          onChange={(e) => setUpdateValue(e.target.value)}
          required
        />
        <Textarea
          id="ur-note"
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting}>
          Log the update
        </Button>
        <p className="text-xs text-slate-500">
          A re-classification is a request, not a change — the desk sets position at approval,
          volume never sets it.
        </p>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries — "log a buyer call" (API-040, raise-an-ask).
 * The buyer's own POST /asks takes no price (BR-121). Here Sales may note what he said he
 * hopes to pay; it is kept on the ask for Sales only and never shown to a seller or to him.
 */
interface CallLine {
  key: number; // Stable across removals, so each line's product picker keeps its own selection.
  skuId: string;
  qty: number;
  /** Rupees as typed; '' when he named no rate. */
  expectedRate: string;
  error?: string; // Set when the server refused this line; the line stays so it can be fixed and retried.
}

// The server needs an expiry requirement on every ask; the call form does not ask for one, so
// every line goes in with the standard "over 12 months".
const CALL_EXPIRY_BAND = 'over12' as const;

function newCallLine(key: number): CallLine {
  return { key, skuId: '', qty: 1, expectedRate: '' };
}

export function LogBuyerCallSection({
  buyerCounterpartyId,
  direction,
  onLogged,
}: {
  buyerCounterpartyId: string;
  direction?: 'in' | 'out';
  /** Called once any ask was raised, so the page can reload its lists. */
  onLogged?: () => void;
}) {
  const { callApi } = useAuth();
  const [lines, setLines] = useState<CallLine[]>(() => [newCallLine(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [callNote, setCallNote] = useState('');
  const [raised, setRaised] = useState<{ asks: number; offers: number }>({ asks: 0, offers: 0 });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateLine = (key: number, patch: Partial<CallLine>): void =>
    setLines((current) => {
      const line = current.find((l) => l.key === key);
      // PackPicker re-reports its pack on every render (its callback is a new function each
      // time), so a no-op update must hand back the same array or this loops forever.
      if (
        !line ||
        (Object.keys(patch) as Array<keyof CallLine>).every((k) => line[k] === patch[k])
      ) {
        return current;
      }
      return current.map((l) => (l.key === key ? { ...l, ...patch } : l));
    });

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setRaised({ asks: 0, offers: 0 });
    const missing = lines.findIndex((l) => !l.skuId);
    if (missing !== -1) {
      setError(`Product ${missing + 1} needs a product and a pack — or remove it.`);
      return;
    }
    const badRate = lines.findIndex(
      (l) => l.expectedRate.trim() !== '' && !(Number(l.expectedRate) > 0),
    );
    if (badRate !== -1) {
      setError(`Product ${badRate + 1}: the expected rate must be more than zero, or left empty.`);
      return;
    }
    setSubmitting(true);
    try {
      const { results } = await callApi((token) =>
        proxyRaiseAsks(token, {
          buyerCounterpartyId,
          callNote,
          ...(direction ? { direction } : {}),
          lines: lines.map((l) => ({
            skuId: l.skuId,
            qty: l.qty,
            conditionRequirement: { expiryBand: CALL_EXPIRY_BAND },
            ...(l.expectedRate.trim() !== ''
              ? { expectedRatePaise: Math.round(Number(l.expectedRate) * 100) }
              : {}),
          })),
        }),
      );
      const failedByKey = new Map<number, string>();
      const tally = { asks: 0, offers: 0 };
      for (const r of results) {
        if ('error' in r) failedByKey.set(lines[r.index]!.key, r.error);
        else if (r.kind === 'ask') tally.asks += 1;
        else tally.offers += 1;
      }
      const saved = tally.asks + tally.offers;
      setRaised(tally);
      if (saved > 0) onLogged?.();
      if (failedByKey.size === 0) {
        // All saved — reset to one fresh line and clear the note for the next call.
        setLines([newCallLine(nextKey)]);
        setNextKey((k) => k + 1);
        setCallNote('');
      } else {
        // Keep only the refused lines, each with its reason. The saved ones are already raised,
        // so leaving them here would raise them twice on a retry.
        setLines(
          lines
            .filter((l) => failedByKey.has(l.key))
            .map((l) => ({ ...l, error: failedByKey.get(l.key) })),
        );
        setError(
          `${saved} of ${results.length} products logged. The rest are below with the reason — fix and log again.`,
        );
      }
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log a buyer call">
      <p className="mb-4 text-sm text-slate-500">
        A call can name several products, all under the one call note. A product on his board puts
        him on its cheapest offer for the seller to confirm (Purchase → Confirmations); one that is
        not listed becomes an ask (Purchase → Demand). The expected rate is only what he said he
        hopes to pay — it stays with Sales and is never shown to a seller or to him (BR-121).
      </p>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="max-w-md">
          <Input
            id="lbc-buyer"
            label="Buyer counterparty ID"
            value={buyerCounterpartyId}
            disabled
          />
        </div>
        {lines.map((line, i) => (
          <CallLineFields
            key={line.key}
            index={i}
            qty={line.qty}
            expectedRate={line.expectedRate}
            error={line.error}
            onSkuChange={(skuId) => updateLine(line.key, { skuId })}
            onQtyChange={(qty) => updateLine(line.key, { qty })}
            onExpectedRateChange={(expectedRate) => updateLine(line.key, { expectedRate })}
            onRemove={
              lines.length > 1
                ? () => setLines((current) => current.filter((l) => l.key !== line.key))
                : undefined
            }
          />
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<FiPlus />}
            onClick={() => {
              setLines((current) => [...current, newCallLine(nextKey)]);
              setNextKey((k) => k + 1);
            }}
          >
            Add another product
          </Button>
        </div>
        <Textarea
          id="lbc-note"
          label="Call note"
          className="max-w-3xl"
          hint="Who called, what was agreed — mandatory on every staff-assisted action. One note covers every product above."
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {raised.asks + raised.offers > 0 && (
          <p className="text-sm text-success-600">
            Logged.{' '}
            {raised.offers > 0 && `${raised.offers} on the board — sent to the seller to confirm. `}
            {raised.asks > 0 &&
              `${raised.asks} not listed — ${raised.asks === 1 ? 'an ask' : 'asks'} for Purchase.`}
          </p>
        )}
        <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
          {lines.length > 1 ? `Log call (${lines.length} products)` : 'Log call'}
        </Button>
      </form>
    </Card>
  );
}
