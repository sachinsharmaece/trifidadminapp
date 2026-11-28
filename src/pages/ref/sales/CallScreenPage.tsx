import { PushToPurchaseButton } from '@/components/ref/sellLeads/PushToPurchaseButton';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR } from '@/lib/refMoney';
import type { RefProduct } from '../purchase/refTypes';
import { tehsilText, type RefBuyer } from './salesTypes';

interface SkuOption {
  id: string;
  packLabel: string;
  productId: string;
  productName: string;
}
interface BoardRow {
  id: string;
  skuId: string;
  productName: string;
  packLabel: string;
  buyerRatePaisePerUnit: number | null;
  boxValuePaise: number | null;
  quantityBoxes: number;
}
interface VisibleListing {
  listingId: string;
  productName: string;
  packLabel: string;
  rateDisplay: string;
  boxValueDisplay: string;
  indicative: boolean;
}
interface CallLogRow {
  id: string;
  buyer: { name: string };
  product: { name: string } | null;
  outcome: string;
  by: string;
  createdAt: string;
}

const OUTCOMES = [
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'NO_STOCK', label: 'No stock' },
  { value: 'PRICE_OBJECTION', label: 'Price objection' },
  { value: 'ASKED_FOR_RATE', label: 'Asked for a rate' },
  { value: 'WANTS_IT', label: 'He wants it' },
  { value: 'CALLBACK_LATER', label: 'Callback later' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'ALREADY_HOLDS_STOCK', label: 'Already holds stock' },
  { value: 'BUYS_DIRECT', label: 'Buys direct from the company' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'WRONG_NUMBER', label: 'Wrong number' },
];

const REASON_CODES = [
  { value: 'RATE_ABOVE_MARKET', label: 'Rate above market' },
  { value: 'NO_STOCK_LISTED', label: 'No stock listed' },
  { value: 'CONDITION_MISMATCH', label: 'Condition mismatch' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * Sales → Call screen, as the reference (app/(sales)/call-screen). Pick the buyer and a pack, see what is listed
 * for him at his rate, then: Take (our "He wants it" + "Send to seller", so it lands on Purchase's Confirmations),
 * Start funnel (opens a viewing and goes to his buyer funnel), or Record a demand when nothing is listed (an ask).
 * In our system a funnel for an unlisted pack starts as an ask, so "start a funnel" there opens the demand form.
 * Every call can be logged, and the buyer can be pushed to Purchase as a seller lead ("Push to purchase").
 */
export function CallScreenPage() {
  useDocumentTitle('Call screen');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [buyers, setBuyers] = useState<RefBuyer[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogRow[]>([]);
  const [manualBuyerId, setManualBuyerId] = useState<string | undefined>(undefined);
  const [skuId, setSkuId] = useState('');
  const [visible, setVisible] = useState<VisibleListing[] | null>(null);
  const [takeQuantity, setTakeQuantity] = useState<Record<string, number | undefined>>({});
  const [takeMessage, setTakeMessage] = useState<string | null>(null);

  const [askFormOpen, setAskFormOpen] = useState(false);
  const [askQuantity, setAskQuantity] = useState<number | undefined>(undefined);
  const [askReasonCode, setAskReasonCode] = useState('');
  const [askConditionNote, setAskConditionNote] = useState('');
  const [askErrors, setAskErrors] = useState<Record<string, string>>({});
  const [askCreated, setAskCreated] = useState<string | null>(null);

  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [logQuantity, setLogQuantity] = useState<number | undefined>(undefined);
  const [logReasonCode, setLogReasonCode] = useState('');
  const [logErrors, setLogErrors] = useState<Record<string, string>>({});

  // The URL wins over a pick made here, so the quick search above takes over at once.
  const buyerId = searchParams.get('buyerId') ?? manualBuyerId;

  async function loadCallLogs() {
    const data = await refGet<{ callLogs: CallLogRow[] }>('/call-logs');
    setCallLogs(data.callLogs ?? []);
  }

  useOnMount(async () => {
    const [b, p] = await Promise.all([
      refGet<{ buyers: RefBuyer[] }>('/buyers', { pageSize: 100, active: 'true' }),
      refGet<{ products: RefProduct[] }>('/products', { pageSize: 100 }),
    ]);
    setBuyers(b.buyers ?? []);
    setSkus(
      (p.products ?? []).flatMap((prod) =>
        prod.skus
          .filter((s) => s.active !== false)
          .map((s) => ({
            id: s.id,
            packLabel: s.packLabel,
            productId: prod.id,
            productName: prod.name,
          })),
      ),
    );
    await loadCallLogs();
  });

  const selectedBuyer = buyers.find((b) => b.id === buyerId);
  const selectedSku = skus.find((s) => s.id === skuId);

  useEffect(() => {
    if (!buyerId || !selectedSku) return;
    let cancelled = false;
    void refGet<{ buyer: { indicative: boolean }; rows: BoardRow[] }>(`/buyers/${buyerId}/board`, {
      q: selectedSku.productName,
      pageSize: 100,
    }).then((data) => {
      if (cancelled) return;
      setVisible(
        (data.rows ?? [])
          .filter((r) => r.skuId === selectedSku.id && r.buyerRatePaisePerUnit !== null)
          .map((r) => ({
            listingId: r.id,
            productName: r.productName,
            packLabel: r.packLabel,
            rateDisplay: `${formatPaiseAsINR(r.buyerRatePaisePerUnit ?? 0)} per unit`,
            boxValueDisplay: formatPaiseAsINR(r.boxValuePaise ?? 0),
            indicative: data.buyer.indicative,
          })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [buyerId, selectedSku]);

  const effectiveVisible = buyerId && skuId ? visible : null;

  const buyerOptions: NamePickerOption[] = buyers.map((b) => ({
    id: b.id,
    label: b.firmName,
    sublabel: tehsilText(b.tehsil),
  }));

  function changeBuyer() {
    setManualBuyerId(undefined);
    setSkuId('');
    setVisible(null);
    void navigate('/call-screen', { replace: true });
  }

  async function openViewing(listingId: string) {
    return refSend<{ trade: { id: string; version: number } }>('POST', '/trades/open-viewing', {
      buyerId,
      listingId,
    });
  }

  async function startFunnel(listingId?: string) {
    if (!buyerId || !selectedSku || !selectedBuyer) return;
    if (!listingId) {
      setAskFormOpen(true);
      return;
    }
    const res = await openViewing(listingId);
    if (!res.ok) {
      setTakeMessage(res.message);
      return;
    }
    void navigate(`/buyer-funnels/${selectedBuyer.id}`);
  }

  async function takeListing(listingId: string) {
    const boxes = takeQuantity[listingId];
    if (!buyerId || !boxes) return;
    setTakeMessage(null);
    const opened = await openViewing(listingId);
    if (!opened.ok) {
      setTakeMessage(opened.message);
      return;
    }
    const t = opened.data.trade;
    const wanted = await refSend<{ trade: { id: string; version: number } }>(
      'POST',
      `/trades/${t.id}/actions/wantIt`,
      { version: t.version, boxes },
    );
    if (!wanted.ok) {
      setTakeMessage(wanted.message);
      return;
    }
    const sent = await refSend('POST', `/trades/${t.id}/actions/sendToSeller`, {
      version: wanted.data.trade.version,
    });
    if (!sent.ok) {
      setTakeMessage(sent.message);
      return;
    }
    setTakeMessage('Sent to Purchase for seller confirmation.');
    setTakeQuantity((q) => ({ ...q, [listingId]: undefined }));
  }

  async function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    setAskErrors({});
    setAskCreated(null);
    if (!buyerId || !selectedSku || askQuantity === undefined || !askReasonCode) {
      setAskErrors({ _form: 'Fill in quantity and reason before recording a demand.' });
      return;
    }
    const res = await refSend<{ ask: { humanCode: string } }>('POST', '/asks', {
      buyerId,
      productId: selectedSku.productId,
      skuId: selectedSku.id,
      quantity: askQuantity,
      reasonCode: askReasonCode,
      conditionNote: askConditionNote || undefined,
    });
    if (!res.ok) {
      setAskErrors({ [res.field ?? '_form']: res.message });
      return;
    }
    setAskCreated(res.data.ask.humanCode);
    setAskFormOpen(false);
    setAskQuantity(undefined);
    setAskReasonCode('');
    setAskConditionNote('');
  }

  async function submitCallLog(e: React.FormEvent) {
    e.preventDefault();
    setLogErrors({});
    if (!buyerId || !outcome) {
      setLogErrors({ _form: 'Pick a buyer and an outcome first.' });
      return;
    }
    const res = await refSend('POST', '/call-logs', {
      buyerId,
      productId: selectedSku?.productId,
      skuId: selectedSku?.id,
      outcome,
      note: note || undefined,
      quantity: logQuantity,
      reasonCode: logReasonCode || undefined,
    });
    if (!res.ok) {
      const field =
        res.field && ['quantity', 'reasonCode'].includes(res.field) ? res.field : '_form';
      setLogErrors({ [field]: res.message });
      return;
    }
    setOutcome('');
    setNote('');
    setLogQuantity(undefined);
    setLogReasonCode('');
    await loadCallLogs();
  }

  const input = 'rounded border border-zinc-300 px-3 py-2 text-sm';

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Call screen</h1>

      <div className="mb-6 flex flex-col gap-3 rounded border border-zinc-200 p-4">
        {selectedBuyer ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-900">
              Calling: <strong>{selectedBuyer.firmName}</strong>
            </p>
            <div className="flex items-center gap-3">
              <PushToPurchaseButton firmId={selectedBuyer.id} firmName={selectedBuyer.firmName} />
              <button
                type="button"
                onClick={changeBuyer}
                className="text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                Change buyer
              </button>
            </div>
          </div>
        ) : (
          <Field label="Buyer">
            <NamePicker
              ariaLabel="Buyer"
              options={buyerOptions}
              value={buyerId}
              onChange={setManualBuyerId}
              placeholder="Search buyers…"
            />
          </Field>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-700">Product / SKU</label>
          <div className="flex flex-wrap gap-2">
            {skus.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSkuId(s.id);
                  setVisible(null);
                }}
                className={`rounded-lg border px-4 py-3 text-left text-sm ${
                  skuId === s.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="font-medium">{s.productName}</div>
                <div className={skuId === s.id ? 'text-zinc-300' : 'text-zinc-400'}>
                  {s.packLabel}
                </div>
              </button>
            ))}
            {skus.length === 0 && <p className="text-sm text-zinc-400">No products set up yet.</p>}
          </div>
        </div>

        {effectiveVisible && effectiveVisible.length > 0 && (
          <div className="flex flex-col gap-3 rounded border border-zinc-100 bg-zinc-50 p-3">
            {effectiveVisible.map((l) => (
              <div
                key={l.listingId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                data-testid="visible-listing"
              >
                <span>
                  {l.productName} — {l.packLabel}
                </span>
                <span className="flex items-center gap-2">
                  <strong>{l.rateDisplay}</strong> (box {l.boxValueDisplay}){' '}
                  {l.indicative && <span className="text-xs text-amber-600">indicative</span>}
                  <QuantityStepper
                    ariaLabel="Boxes to take"
                    value={takeQuantity[l.listingId]}
                    onChange={(v) => setTakeQuantity((q) => ({ ...q, [l.listingId]: v }))}
                  />
                  <button
                    type="button"
                    onClick={() => void takeListing(l.listingId)}
                    disabled={!takeQuantity[l.listingId]}
                    className="rounded bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Take
                  </button>
                  <button
                    type="button"
                    onClick={() => void startFunnel(l.listingId)}
                    className="rounded border border-zinc-300 px-3 py-2 text-xs text-zinc-700"
                  >
                    Start funnel
                  </button>
                </span>
              </div>
            ))}
            {takeMessage && <p className="text-xs text-green-700">{takeMessage}</p>}
          </div>
        )}

        {effectiveVisible && effectiveVisible.length === 0 && (
          <div className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-500">
            Nothing listed for this buyer.{' '}
            <button
              type="button"
              onClick={() => setAskFormOpen(true)}
              className="text-zinc-900 underline"
            >
              Record a demand
            </button>{' '}
            or{' '}
            <button
              type="button"
              onClick={() => void startFunnel()}
              className="text-zinc-900 underline"
            >
              start a funnel
            </button>
          </div>
        )}

        {askFormOpen && (
          <form
            onSubmit={(e) => void submitAsk(e)}
            className="flex flex-col gap-2 rounded border border-zinc-200 p-3"
          >
            <Field label="Quantity (boxes)">
              <QuantityStepper
                ariaLabel="Demand quantity"
                value={askQuantity}
                onChange={setAskQuantity}
              />
            </Field>
            <Field label="Reason" error={askErrors.reasonCode}>
              <select
                aria-label="Demand reason"
                value={askReasonCode}
                onChange={(e) => setAskReasonCode(e.target.value)}
                className={input}
              >
                <option value="">Select…</option>
                {REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condition requirement (optional)">
              <input
                value={askConditionNote}
                onChange={(e) => setAskConditionNote(e.target.value)}
                className={input}
              />
            </Field>
            {askErrors._form && <p className="text-xs text-red-600">{askErrors._form}</p>}
            <button
              type="submit"
              className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Record demand
            </button>
          </form>
        )}
        {askCreated && <p className="text-xs text-green-700">Created {askCreated}.</p>}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Log this call</h2>
        <form onSubmit={(e) => void submitCallLog(e)} className="flex flex-col gap-3">
          <Field label="Outcome">
            <select
              aria-label="Outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className={input}
            >
              <option value="">Select…</option>
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {outcome === 'ASKED_FOR_RATE' && (
            <>
              <Field label="Quantity (boxes)" error={logErrors.quantity}>
                <QuantityStepper
                  ariaLabel="Call quantity"
                  value={logQuantity}
                  onChange={setLogQuantity}
                />
              </Field>
              <Field label="Reason" error={logErrors.reasonCode}>
                <select
                  aria-label="Call reason"
                  value={logReasonCode}
                  onChange={(e) => setLogReasonCode(e.target.value)}
                  className={input}
                >
                  <option value="">Select…</option>
                  {REASON_CODES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {outcome === 'WANTS_IT' && !skuId && (
            <p className="text-xs text-red-600">Pick a product/SKU above first.</p>
          )}

          <Field label="Note (optional)">
            <input
              aria-label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={input}
            />
          </Field>

          {logErrors._form && <p className="text-xs text-red-600">{logErrors._form}</p>}

          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Log call
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Call log</h2>
        <table className="w-full text-sm" data-testid="call-log">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2">Buyer</th>
              <th className="py-2">Product</th>
              <th className="py-2">Outcome</th>
              <th className="py-2">BY</th>
              <th className="py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {callLogs.map((log) => (
              <tr key={log.id} className="border-t border-zinc-100">
                <td className="py-2">{log.buyer.name}</td>
                <td className="py-2">{log.product?.name ?? '—'}</td>
                <td className="py-2">
                  {OUTCOMES.find((o) => o.value === log.outcome)?.label ?? log.outcome}
                </td>
                <td className="py-2">{log.by}</td>
                <td className="py-2">{formatDateIST(log.createdAt, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
