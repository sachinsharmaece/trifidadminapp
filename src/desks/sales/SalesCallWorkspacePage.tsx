import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiPhoneCall, FiPlus } from 'react-icons/fi';
import {
  proxyRaiseAsks,
  proxyAcceptAskFill,
  proxyDeclineAsk,
  proxyAcceptPromotion,
  proxyRejectPromotion,
  proxyListBuyerAsks,
  type ProxyAskItem,
  type ProxyAskQuote,
} from '../../api/proxy';
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
  type CallOutcome,
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

const OUTCOMES: CallOutcome[] = [
  'placed_an_order',
  'asked_for_a_rate',
  'wants_something_we_dont_stock',
  'rate_too_high',
  'already_holds_stock',
  'buys_direct_from_company',
  'not_now_call_later',
  'no_answer',
  'wrong_number',
];

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
 * (`/sales/call/:buyerId`). `LogBuyerCallSection` and `AdvanceAskSection`
 * are relocated as-is from the old flat `SalesDeskPage` (kept unchanged
 * below); this pass adds buyer-header context, the "on the board for him"
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
  // Bumped after any call action (raising, advancing or declining an ask, a
  // promoted-offer decision), so "Advance an ask" and the call history reload.
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
            <AdvanceAskSection
              buyerCounterpartyId={file.counterpartyId}
              direction={direction}
              refreshKey={callsVersion}
              onActed={onCallLogged}
            />

            <CallOutcomeSection buyerId={buyerId} direction={direction} refreshKey={callsVersion} />
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
 * "He wants it" raises a real ask for this buyer — it then shows under He asked — and
 * `onChanged` lets the page refetch. (28 Oct: the call page used to leave out
 * `counterpartyId`, and the button then only logged a note, so nothing reached He asked.)
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
            />
          ))}
        </div>
      )}
    </AsyncBoundary>
  );
}

function BoardProductBlock({
  counterpartyId,
  direction,
  onChanged,
  detail,
}: {
  counterpartyId: string;
  direction?: 'in' | 'out';
  onChanged?: () => void;
  detail: BoardForBuyerProduct;
}) {
  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-900">{detail.brand}</h3>
      <p className="text-xs text-slate-500">{detail.technicalName}</p>
      {detail.ladder.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Nothing on the board for this product.</p>
      ) : (
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

/** "What the call produced" (a fresh call log) plus this buyer's call history below it. */
function CallOutcomeSection({
  buyerId,
  direction,
  refreshKey = 0,
}: {
  buyerId: string;
  direction: 'in' | 'out';
  /** Changes after a call action elsewhere on the page, so the history reloads. */
  refreshKey?: number;
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [outcome, setOutcome] = useState<CallOutcome>(OUTCOMES[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const historyLoader = useCallback(
    () => callApi((token) => listCallLogsForBuyer(token, buyerId)),
    [callApi, buyerId, refreshKey],
  );
  const { state: historyState, retry: retryHistory } = useAsyncData(
    historyLoader,
    (items) => items.length === 0,
    [historyLoader],
  );

  async function handleSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        createCallLog(token, { buyerId, direction, kind: 'call', outcome, note }),
      );
      setNote('');
      show('Call saved.');
      retryHistory();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not save the call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card title="What the call produced">
        <form onSubmit={handleSave} className="flex max-w-md flex-col gap-4">
          <Select
            id="co-outcome"
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CallOutcome)}
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {humanizeCapitalized(o)}
              </option>
            ))}
          </Select>
          <Textarea
            id="co-note"
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
            Save the call
          </Button>
        </form>
      </Card>

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
    </>
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
  const [raised, setRaised] = useState<string[]>([]);
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
    setRaised([]);
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
      const askIds: string[] = [];
      for (const r of results) {
        if ('askId' in r) askIds.push(r.askId);
        else failedByKey.set(lines[r.index]!.key, r.error);
      }
      setRaised(askIds);
      if (askIds.length > 0) onLogged?.();
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
          `${askIds.length} of ${results.length} products logged. The rest are below with the reason — fix and log again.`,
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
        Raises an ask on the buyer&apos;s behalf. A call can name several products: each becomes its
        own ask, all under the one call note. The expected rate is only what he said he hopes to pay
        — it stays with Sales and is never shown to a seller or to him (BR-121).
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
        {raised.length > 0 && (
          <p className="text-sm text-success-600">
            Logged {raised.length === 1 ? 'as ask' : `${raised.length} asks`}: {raised.join(', ')}.
          </p>
        )}
        <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
          {lines.length > 1 ? `Log call (${lines.length} products)` : 'Log call'}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries — advancing an ask on a call (API-042 accept-fill
 * / API-043 walk-away), and the WF-11 promoted-fallback decision (API-071)
 * a buyer might also decide over the phone.
 */
/**
 * `AskPicker` / `QuotePicker` — B-17's other half. Same shape as
 * `enquiryPickers.tsx`'s pickers, kept local because they need the buyer
 * already on this page rather than picking one themselves: list the
 * buyer's open asks via the same read `GET /asks` uses (`listMyAsks`), then
 * for the chosen ask list its own live quotes — no comma-separated IDs.
 */
function AskPicker({
  buyerCounterpartyId,
  asks,
  value,
  onChange,
}: {
  buyerCounterpartyId: string;
  asks: ProxyAskItem[];
  value: string;
  onChange: (askId: string) => void;
}) {
  const advanceable = asks.filter((a) => a.state === 'open' || a.state === 'quoted');
  return (
    <Select
      id="aa-ask"
      label="Ask"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!buyerCounterpartyId}
      required
    >
      <option value="">Choose one of his open asks…</option>
      {advanceable.map((a) => (
        <option key={a.askId} value={a.askId}>
          {a.qty} boxes · {a.quotes.length} live quote{a.quotes.length === 1 ? '' : 's'} · {a.state}
        </option>
      ))}
    </Select>
  );
}

function QuotePicker({
  quotes,
  selected,
  onChange,
}: {
  quotes: ProxyAskQuote[];
  selected: string[];
  onChange: (quoteIds: string[]) => void;
}) {
  const live = quotes.filter((q) => q.status === 'live');
  if (live.length === 0) {
    return <p className="text-sm text-slate-500">No live quotes on this ask yet.</p>;
  }
  function toggle(quoteId: string): void {
    onChange(
      selected.includes(quoteId) ? selected.filter((id) => id !== quoteId) : [...selected, quoteId],
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Quote(s) the buyer accepted</span>
      {live.map((q) => (
        <label
          key={q.quoteId}
          className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(q.quoteId)}
            onChange={() => toggle(q.quoteId)}
          />
          <span className="font-semibold text-slate-900">
            {q.ratePaiseForIndore != null ? formatRupees(q.ratePaiseForIndore) : 'no rate'}
          </span>
          <span className="text-slate-500">qty {q.qtyAvailable}</span>
          <span className="text-slate-500">{q.daysToIndore}d to Indore</span>
        </label>
      ))}
    </div>
  );
}

function AdvanceAskSection({
  buyerCounterpartyId,
  direction,
  refreshKey = 0,
  onActed,
}: {
  buyerCounterpartyId: string;
  direction?: 'in' | 'out';
  /** Changes when an ask is raised elsewhere on the page, so the list reloads. */
  refreshKey?: number;
  /** Called after an accept, decline or promoted-offer decision. */
  onActed?: () => void;
}) {
  const { callApi } = useAuth();
  const [askId, setAskId] = useState('');
  const [option, setOption] = useState<'partial' | 'full'>('full');
  const [quoteIds, setQuoteIds] = useState<string[]>([]);
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [soId, setSoId] = useState('');
  const [promotionNote, setPromotionNote] = useState('');
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  const asksLoader = useCallback(
    () => callApi((token) => proxyListBuyerAsks(token, buyerCounterpartyId)),
    // refreshKey: reload after "He wants it" raises an ask on this page.
    [callApi, buyerCounterpartyId, refreshKey],
  );
  const { state: asksState, retry: retryAsks } = useAsyncData(
    asksLoader,
    (items) => items.length === 0,
    [asksLoader],
  );
  const asks = asksState.status === 'success' ? asksState.data : [];
  const selectedAsk = asks.find((a) => a.askId === askId);

  function handleAskChange(nextAskId: string): void {
    setAskId(nextAskId);
    setQuoteIds([]);
  }

  async function handleAccept(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const result = await callApi((token) =>
        proxyAcceptAskFill(token, askId, {
          buyerCounterpartyId,
          option,
          quoteIds,
          callNote,
          ...(direction ? { direction } : {}),
        }),
      );
      setMessage(
        `Accepted — ${result.soIds.length} order${result.soIds.length === 1 ? '' : 's'} placed.`,
      );
      setAskId('');
      setQuoteIds([]);
      retryAsks();
      onActed?.();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept this fill.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyDeclineAsk(token, askId, {
          buyerCounterpartyId,
          callNote,
          ...(direction ? { direction } : {}),
        }),
      );
      setMessage('Walked away — free, no strike.');
      setAskId('');
      setQuoteIds([]);
      retryAsks();
      onActed?.();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not decline.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromotionAccept(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyAcceptPromotion(token, soId, {
          buyerCounterpartyId,
          callNote: promotionNote,
          ...(direction ? { direction } : {}),
        }),
      );
      setPromotionMessage('Accepted the replacement seller.');
      onActed?.();
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept.',
      );
    }
  }

  async function handlePromotionReject(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyRejectPromotion(token, soId, {
          buyerCounterpartyId,
          callNote: promotionNote,
          ...(direction ? { direction } : {}),
        }),
      );
      setPromotionMessage('Declined — refunded on the next run.');
      onActed?.();
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not decline.',
      );
    }
  }

  return (
    <Card title="Advance an ask on a call">
      <p className="mb-4 text-sm text-slate-500">
        Confirming a rate over the phone and accepting a fill are the same action in this system
        (API-042) — pick the quote(s) the buyer accepted below. Walking away is free and never a
        strike (API-043).
      </p>
      <AsyncBoundary state={asksState} onRetry={retryAsks} emptyMessage="He has no open asks.">
        {() => (
          <div className="flex max-w-md flex-col gap-4">
            <AskPicker
              buyerCounterpartyId={buyerCounterpartyId}
              asks={asks}
              value={askId}
              onChange={handleAskChange}
            />
            <Input
              id="aa-buyer"
              label="Buyer counterparty ID"
              value={buyerCounterpartyId}
              disabled
            />
            <Select
              id="aa-option"
              label="Option"
              value={option}
              onChange={(e) => setOption(e.target.value as typeof option)}
            >
              <option value="full">Full — the partial plus the balance</option>
              <option value="partial">Partial — the cheap portion alone</option>
            </Select>
            {selectedAsk && (
              <QuotePicker quotes={selectedAsk.quotes} selected={quoteIds} onChange={setQuoteIds} />
            )}
            <Textarea
              id="aa-note"
              label="Call note"
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              required
            />
            {error && (
              <p role="alert" className="text-sm text-danger-500">
                {error}
              </p>
            )}
            {message && <p className="text-sm text-success-600">{message}</p>}
            <div className="flex gap-2">
              <Button
                loading={submitting}
                disabled={!askId || !buyerCounterpartyId || !callNote || quoteIds.length === 0}
                onClick={() => void handleAccept()}
                icon={<FiCheck />}
              >
                Accept fill
              </Button>
              <Button
                variant="secondary"
                loading={submitting}
                disabled={!askId || !buyerCounterpartyId || !callNote}
                onClick={() => void handleDecline()}
                icon={<FiX />}
              >
                Walk away
              </Button>
            </div>
          </div>
        )}
      </AsyncBoundary>

      <div className="mt-6 flex max-w-md flex-col gap-4 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Promoted-fallback decision (WF-11)</h3>
        <Input
          id="aa-so"
          label="Order (SO) ID"
          value={soId}
          onChange={(e) => setSoId(e.target.value)}
        />
        <Textarea
          id="aa-promo-note"
          label="Call note"
          value={promotionNote}
          onChange={(e) => setPromotionNote(e.target.value)}
        />
        {promotionError && (
          <p role="alert" className="text-sm text-danger-500">
            {promotionError}
          </p>
        )}
        {promotionMessage && <p className="text-sm text-success-600">{promotionMessage}</p>}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!soId || !buyerCounterpartyId || !promotionNote}
            onClick={() => void handlePromotionAccept()}
            icon={<FiCheck />}
          >
            Accept replacement
          </Button>
          <Button
            variant="secondary"
            disabled={!soId || !buyerCounterpartyId || !promotionNote}
            onClick={() => void handlePromotionReject()}
            icon={<FiX />}
          >
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}
