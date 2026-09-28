import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiPhoneCall } from 'react-icons/fi';
import {
  proxyRaiseAsk,
  proxyAcceptAskFill,
  proxyDeclineAsk,
  proxyAcceptPromotion,
  proxyRejectPromotion,
} from '../../api/proxy';
import {
  getSalesBuyerFile,
  getSalesBoardProduct,
  createCallLog,
  listCallLogsForBuyer,
  type BuyerFileDto,
  type BuyerProductHistoryRow,
  type BoardProductDetail,
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

  const fileLoader = useCallback(
    () => callApi((token) => getSalesBuyerFile(token, buyerId)),
    [callApi, buyerId],
  );
  const { state: fileState, retry: retryFile } = useAsyncData(fileLoader, () => false, [fileLoader]);

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
            <BoardForHimSection buyerId={buyerId} productHistory={file.productHistory} />
          </div>
        )}
      </AsyncBoundary>

      <DirectionToggle direction={direction} onChange={setDirection} />

      <LogBuyerCallSection buyerId={buyerId} />
      <AdvanceAskSection buyerId={buyerId} />

      <CallOutcomeSection buyerId={buyerId} direction={direction} />
      <UpdateRequestSection buyerId={buyerId} />
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
 * "On the board for him" — only his own product history (capped at 5), not
 * the whole catalogue: this fetches a handful of `getSalesBoardProduct`
 * calls, never `getSalesBoard()` followed by one call per catalog product.
 */
function BoardForHimSection({
  buyerId,
  productHistory,
}: {
  buyerId: string;
  productHistory: BuyerProductHistoryRow[];
}) {
  const { callApi } = useAuth();
  const capped = useMemo(() => productHistory.slice(0, 5), [productHistory]);
  const loader = useCallback(
    () =>
      callApi((token) =>
        Promise.all(capped.map((p) => getSalesBoardProduct(token, p.productId, { buyerId }))),
      ),
    [callApi, buyerId, capped],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  if (productHistory.length === 0) {
    return (
      <Card title="On the board for him">
        <p className="text-sm text-slate-500">
          He has never ordered — nothing to show him from his own history yet.
        </p>
      </Card>
    );
  }

  return (
    <Card title="On the board for him">
      <AsyncBoundary
        state={state}
        onRetry={retry}
        emptyMessage="Nothing on the board for his products right now."
      >
        {(details: BoardProductDetail[]) => (
          <div className="flex flex-col gap-5">
            {details.map((detail) => (
              <BoardProductBlock key={detail.productId} buyerId={buyerId} detail={detail} />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function BoardProductBlock({
  buyerId,
  detail,
}: {
  buyerId: string;
  detail: BoardProductDetail;
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [submittingLine, setSubmittingLine] = useState<string | null>(null);

  async function handleWantsIt(listingLineId: string): Promise<void> {
    setSubmittingLine(listingLineId);
    try {
      await callApi((token) =>
        createCallLog(token, {
          buyerId,
          kind: 'note',
          note: 'Named interest in this rate.',
          listingLineId,
        }),
      );
      show('Logged his interest.');
    } catch {
      show('Could not log this.');
    } finally {
      setSubmittingLine(null);
    }
  }

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
                  {line.ratePaise != null ? `₹${(line.ratePaise / 100).toFixed(2)}` : 'no rate'}
                </span>
                <Badge tone="neutral" variant="chip">
                  {line.expiryBand}
                </Badge>
                <Badge tone="neutral" variant="chip">
                  {line.moqBand}
                </Badge>
                <Badge tone="neutral" variant="chip">
                  {line.deliveryBand}
                </Badge>
                <span className="text-xs text-slate-500">qty {line.qty}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={submittingLine === line.listingLineId}
                onClick={() => void handleWantsIt(line.listingLineId)}
              >
                He wants it
              </Button>
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
}: {
  buyerId: string;
  direction: 'in' | 'out';
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [outcome, setOutcome] = useState<CallOutcome>(OUTCOMES[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const historyLoader = useCallback(
    () => callApi((token) => listCallLogsForBuyer(token, buyerId)),
    [callApi, buyerId],
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
                    <Td>{new Date(c.at).toLocaleString()}</Td>
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
 * Same validation as the buyer's own POST /asks: no price field exists on
 * this form at all (BR-121), exactly as the real endpoint refuses one sent.
 */
function LogBuyerCallSection({ buyerId }: { buyerId: string }) {
  const { callApi } = useAuth();
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(1);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ askId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyRaiseAsk(token, {
            buyerCounterpartyId: buyerId,
            skuId,
            qty,
            conditionRequirement: { expiryBand },
            callNote,
          }),
        ),
      );
      setSkuId('');
      setQty(1);
      setCallNote('');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log a buyer call">
      <p className="mb-4 text-sm text-slate-500">
        Raises an ask on the buyer&apos;s behalf — same as the buyer&apos;s own screen. He states no
        price; TriFid never names one before a seller has (BR-121).
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input id="lbc-buyer" label="Buyer counterparty ID" value={buyerId} disabled />
        <Input
          id="lbc-sku"
          label="SKU ID"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        />
        <Input
          id="lbc-qty"
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
        />
        <Select
          id="lbc-expiry"
          label="Expiry requirement"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as typeof expiryBand)}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Textarea
          id="lbc-note"
          label="Call note"
          hint="Who called, what was agreed — mandatory on every staff-assisted action."
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Logged as ask {result.askId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
          Log call
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
function AdvanceAskSection({ buyerId }: { buyerId: string }) {
  const { callApi } = useAuth();
  const [askId, setAskId] = useState('');
  const [option, setOption] = useState<'partial' | 'full'>('full');
  const [quoteIdsText, setQuoteIdsText] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [soId, setSoId] = useState('');
  const [promotionNote, setPromotionNote] = useState('');
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const quoteIds = quoteIdsText
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const result = await callApi((token) =>
        proxyAcceptAskFill(token, askId, {
          buyerCounterpartyId: buyerId,
          option,
          quoteIds,
          callNote,
        }),
      );
      setMessage(`Accepted — order(s): ${result.soIds.join(', ')}.`);
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
        proxyDeclineAsk(token, askId, { buyerCounterpartyId: buyerId, callNote }),
      );
      setMessage('Walked away — free, no strike.');
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
          buyerCounterpartyId: buyerId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Accepted the replacement seller.');
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
          buyerCounterpartyId: buyerId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Declined — refunded on the next run.');
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
        (API-042) — enter the quote(s) the buyer accepted below. Walking away is free and never a
        strike (API-043).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="aa-ask"
          label="Ask ID"
          value={askId}
          onChange={(e) => setAskId(e.target.value)}
          required
        />
        <Input id="aa-buyer" label="Buyer counterparty ID" value={buyerId} disabled />
        <Select
          id="aa-option"
          label="Option"
          value={option}
          onChange={(e) => setOption(e.target.value as typeof option)}
        >
          <option value="full">Full — the partial plus the balance</option>
          <option value="partial">Partial — the cheap portion alone</option>
        </Select>
        <Input
          id="aa-quotes"
          label="Quote ID(s), comma-separated"
          value={quoteIdsText}
          onChange={(e) => setQuoteIdsText(e.target.value)}
        />
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
            disabled={!askId || !buyerId || !callNote}
            onClick={() => void handleAccept()}
            icon={<FiCheck />}
          >
            Accept fill
          </Button>
          <Button
            variant="secondary"
            loading={submitting}
            disabled={!askId || !buyerId || !callNote}
            onClick={() => void handleDecline()}
            icon={<FiX />}
          >
            Walk away
          </Button>
        </div>
      </div>

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
            disabled={!soId || !buyerId || !promotionNote}
            onClick={() => void handlePromotionAccept()}
            icon={<FiCheck />}
          >
            Accept replacement
          </Button>
          <Button
            variant="secondary"
            disabled={!soId || !buyerId || !promotionNote}
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
