import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  proxyAcceptAskFill,
  proxyDeclineAsk,
  proxyRaiseAsk,
} from '../../api/proxy';
import {
  cancelUnpaidOrder,
  dispatchOrder,
  getSalesBoardForBuyer,
  giveRateOnAsk,
  markOrderBilled,
  markOrderDelivered,
  markOrderPaid,
  skipOrderToBilled,
  type BoardForBuyerLine,
  type BoardForBuyerProduct,
  type BuyerFileLiveQuote,
  type BuyerFileOpenAsk,
  type SalesOrderRow,
} from '../../api/sales';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { PERMISSIONS } from '../../lib/permissions';
import { deliveryBandLabel, expiryBandLabel, formatRupees, moqBandLabel } from '../../lib/labels';

/**
 * Buyer file stage buttons — Sales moving one enquiry to its next section by hand.
 * Every button opens a small form with the mandatory call note, then calls the same
 * endpoint the normal flow uses; the page refetches and the row appears in its new section.
 */

/** A refusal the form should show as-is (not a fault) — e.g. a Marg invoice that did not match. */
class ActionRefused extends Error {}

function errorText(error: unknown): string {
  return error instanceof ApiError || error instanceof ActionRefused
    ? error.message
    : 'Something went wrong. Please try again.';
}

/** A modal with the call-note field and submit button every stage action shares. */
function ActionModal({
  open,
  title,
  submitLabel,
  danger = false,
  canSubmit = true,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  danger?: boolean;
  canSubmit?: boolean;
  onClose: () => void;
  onSubmit: (callNote: string) => Promise<void>;
  children?: ReactNode;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!note.trim()) {
      setError('Add a one-line note on what he said.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(note.trim());
      onClose();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        {children}
        <Textarea
          label="Call note"
          required
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="Kept on the record with your name."
        />
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button
            type="submit"
            variant={danger ? 'danger' : 'primary'}
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Wires a button to an `ActionModal`; `run` does the call, `done` refetches the page. */
function useAction(run: (token: string, callNote: string) => Promise<string>, done: () => void) {
  const { callApi } = useAuth();
  const { show } = useToast();
  return useCallback(
    async (callNote: string): Promise<void> => {
      const message = await callApi((token) => run(token, callNote));
      show(message);
      done();
    },
    [callApi, show, run, done],
  );
}

/** On the board → He asked. */
export function HeWantsItButton({
  line,
  counterpartyId,
  onDone,
}: {
  line: BoardForBuyerLine;
  counterpartyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState('1');
  const parsedQty = Number(qty);
  const qtyOk = Number.isInteger(parsedQty) && parsedQty >= 1;
  const submit = useAction(async (token, callNote) => {
    await proxyRaiseAsk(token, {
      buyerCounterpartyId: counterpartyId,
      skuId: line.skuId,
      qty: parsedQty,
      conditionRequirement: {
        expiryBand: line.expiryBand as 'over12' | 'under12',
        deliveryBand: line.deliveryBand as '48h' | '2-5d',
      },
      callNote,
    });
    return 'Moved to He asked.';
  }, onDone);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        He wants it
      </Button>
      <ActionModal
        open={open}
        title="He wants it"
        submitLabel="Add to He asked"
        canSubmit={qtyOk}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {line.packLabel} at {formatRupees(line.ratePaise)} — {expiryBandLabel(line.expiryBand)},{' '}
          {deliveryBandLabel(line.deliveryBand)}.
        </p>
        <Input
          label="Boxes he wants"
          type="number"
          min={1}
          required
          value={qty}
          onChange={(event) => setQty(event.target.value)}
        />
      </ActionModal>
    </>
  );
}

/** Walks away from / cancels an ask — free, never a strike (BR-130). */
export function CancelAskButton({
  askId,
  counterpartyId,
  label,
  onDone,
}: {
  askId: string;
  counterpartyId: string;
  label: 'Cancel' | 'Walk away';
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await proxyDeclineAsk(token, askId, { buyerCounterpartyId: counterpartyId, callNote });
    return 'Ask withdrawn.';
  }, onDone);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ActionModal
        open={open}
        title={label === 'Walk away' ? 'He walks away' : 'Cancel this ask'}
        submitLabel={label === 'Walk away' ? 'Walk away' : 'Cancel ask'}
        danger
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          The ask and any rate held on it close. This is free and counts nothing against him.
        </p>
      </ActionModal>
    </>
  );
}

/** He asked → Rate given: pick which line on his board is the rate we give him. */
export function GiveRateButton({
  ask,
  buyerId,
  onDone,
}: {
  ask: BuyerFileOpenAsk;
  buyerId: string;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<BoardForBuyerLine[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedId(null);
    setLoadError(null);
    setLines(null);
    callApi((token) => getSalesBoardForBuyer(token, buyerId))
      .then((products: BoardForBuyerProduct[]) => {
        const matching = products
          .filter((p) => (ask.productId ? p.productId === ask.productId : true))
          .flatMap((p) => p.ladder)
          .filter((l) => (ask.skuId ? l.skuId === ask.skuId : true));
        setLines(matching);
      })
      .catch((caught: unknown) => setLoadError(errorText(caught)));
  }, [open, callApi, buyerId, ask.productId, ask.skuId]);

  const submit = useAction(async (token, callNote) => {
    await giveRateOnAsk(token, ask.askId, { listingLineId: pickedId!, callNote });
    return 'Rate given — moved to Rate given.';
  }, onDone);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Give rate
      </Button>
      <ActionModal
        open={open}
        title="Give him a rate"
        submitLabel="Give this rate"
        canSubmit={pickedId !== null}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {ask.brand}
          {ask.packLabel ? ` · ${ask.packLabel}` : ''} — he asked for {ask.qty}. Pick the rate from
          his board; he holds it for 24 hours.
        </p>
        {loadError && (
          <p role="alert" className="text-sm text-danger-600">
            {loadError}
          </p>
        )}
        {lines === null && !loadError && <p className="text-sm text-slate-500">Loading his board…</p>}
        {lines?.length === 0 && (
          <p className="text-sm text-slate-500">Nothing on his board matches this ask right now.</p>
        )}
        {lines && lines.length > 0 && (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.listingLineId}>
                <label
                  className={`flex cursor-pointer flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${
                    pickedId === line.listingLineId
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="give-rate-line"
                    checked={pickedId === line.listingLineId}
                    onChange={() => setPickedId(line.listingLineId)}
                  />
                  <span className="font-semibold text-slate-900">{formatRupees(line.ratePaise)}</span>
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
                </label>
              </li>
            ))}
          </ul>
        )}
      </ActionModal>
    </>
  );
}

/** Rate given → Payment pending: he takes the rate, so the order is raised. */
export function ConfirmRateButton({
  quote,
  counterpartyId,
  onDone,
}: {
  quote: BuyerFileLiveQuote;
  counterpartyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    const result = await proxyAcceptAskFill(token, quote.askId, {
      buyerCounterpartyId: counterpartyId,
      option: quote.qtyAvailable < quote.askQty ? 'partial' : 'full',
      quoteIds: [quote.quoteId],
      callNote,
    });
    return result.soIds.length > 0 ? 'Order raised — now in Payment pending.' : 'Confirmed.';
  }, onDone);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Confirm
      </Button>
      <ActionModal
        open={open}
        title="He confirms the rate"
        submitLabel="Confirm and raise the order"
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {quote.brand}
          {quote.packLabel ? ` · ${quote.packLabel}` : ''}, {quote.qtyAvailable} available. This
          raises his order and starts his 24-hour payment window.
        </p>
      </ActionModal>
    </>
  );
}

/** Payment pending → Paid: Sales takes the UTR, posts the receipt and releases the PO. */
export function MarkPaidButton({ order, onDone }: { order: SalesOrderRow; onDone: () => void }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [utr, setUtr] = useState('');
  const submit = useAction(async (token, callNote) => {
    const result = await markOrderPaid(token, order.soId, { utr: utr.trim(), callNote });
    return `Marked paid — ${result.poNo} released.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.SALES_MARK_PAID)) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Mark paid
      </Button>
      <ActionModal
        open={open}
        title={`Mark ${order.soNo} paid`}
        submitLabel="Mark paid"
        canSubmit={utr.trim().length >= 6}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          Records ₹{(order.totalPaise / 100).toFixed(2)} received for this order and releases the
          purchase order. The UTR goes on the bank book, so it must be the real one.
        </p>
        <Input
          label="UTR / bank reference"
          required
          value={utr}
          onChange={(event) => setUtr(event.target.value)}
        />
      </ActionModal>
    </>
  );
}

/** What an order in Paid is still waiting on before it can be billed — it is never faked from here. */
export function paidWaitingOn(state: string): string | null {
  if (state === 'po_released') return 'Waiting on leg 1 dispatch';
  if (state === 'dispatched_leg1' || state === 'at_indore') return 'Waiting on dock inspection';
  return null;
}

/** Paid → Billed: key the Marg invoice. Only offered once the dock has inspected the order. */
export function MarkBilledButton({
  order,
  onDone,
  skipSteps = false,
}: {
  order: SalesOrderRow;
  onDone: () => void;
  /** INTERIM — the order is not inspected yet; Sales records leg 1 and the inspection too. */
  skipSteps?: boolean;
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [legOneRef, setLegOneRef] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState((order.totalPaise / 100).toFixed(2));
  const [ewayNo, setEwayNo] = useState('');
  const valuePaise = Math.round(Number(value) * 100);
  const submit = useAction(async (token, callNote) => {
    const fields = {
      margInvoiceNo: invoiceNo.trim(),
      date: new Date(date).toISOString(),
      valuePaise,
      ewayNo: ewayNo.trim(),
      callNote,
    };
    const result = skipSteps
      ? await skipOrderToBilled(token, order.soId, {
          ...fields,
          ...(legOneRef.trim() ? { legOneRef: legOneRef.trim() } : {}),
        })
      : await markOrderBilled(token, order.soId, fields);
    if (result.state === 'query') {
      throw new ActionRefused(
        'The invoice value is more than ₹5 away from the order total, so it was logged as a query and nothing moved. Re-key it with the correct value.',
      );
    }
    return `${order.soNo} billed — now in Billed.`;
  }, onDone);
  if (!hasPermission(skipSteps ? PERMISSIONS.SALES_SKIP_TO_BILLED : PERMISSIONS.SALES_MARK_BILLED)) {
    return null;
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {skipSteps ? 'Move to billed' : 'Mark billed'}
      </Button>
      <ActionModal
        open={open}
        title={`Bill ${order.soNo} in Marg`}
        submitLabel={skipSteps ? 'Skip ahead and bill' : 'Mark billed'}
        canSubmit={
          invoiceNo.trim().length > 0 && ewayNo.trim().length > 0 && Number.isFinite(valuePaise) && valuePaise > 0
        }
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        {skipSteps && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">This skips Logistics and the dock.</p>
            <p>
              It records leg 1 and an all-accepted inspection as “recorded by Sales, not
              physically verified”, which also books the seller’s bill. Only use it when the goods
              really did reach Indore in full.
            </p>
          </div>
        )}
        <p className="text-sm text-slate-600">
          Key the invoice exactly as it stands in Marg. The value must be within ₹5 of the order
          total (₹{(order.totalPaise / 100).toFixed(2)}) — there is no override.
        </p>
        {skipSteps && order.state === 'po_released' && (
          <Input
            label="Leg 1 reference (LR or bus number), if you have it"
            value={legOneRef}
            onChange={(event) => setLegOneRef(event.target.value)}
          />
        )}
        <Input
          label="Marg invoice number"
          required
          value={invoiceNo}
          onChange={(event) => setInvoiceNo(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Invoice date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Input
            label="Invoice value (₹)"
            type="number"
            step="0.01"
            min="0"
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <Input
          label="E-way bill number"
          required
          value={ewayNo}
          onChange={(event) => setEwayNo(event.target.value)}
        />
      </ActionModal>
    </>
  );
}

/** Billed → Dispatch: leg 2 leaves Indore — the same record Logistics keeps (BR-176). */
export function DispatchButton({ order, onDone }: { order: SalesOrderRow; onDone: () => void }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'transport' | 'bus'>('transport');
  const [transporter, setTransporter] = useState('');
  const [lr, setLr] = useState('');
  const [busNo, setBusNo] = useState('');
  const [driver, setDriver] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [freightTerms, setFreightTerms] = useState<'prepaid' | 'to_pay'>('to_pay');
  const [freight, setFreight] = useState('0');
  const freightAmountPaise = Math.round(Number(freight) * 100);
  const detailsOk =
    mode === 'transport'
      ? lr.trim().length > 0
      : busNo.trim().length > 0 && driver.trim().length > 0 && driverMobile.trim().length > 0;
  const submit = useAction(async (token, callNote) => {
    await dispatchOrder(token, order.soId, {
      mode,
      ...(mode === 'transport'
        ? { ...(transporter.trim() ? { transporter: transporter.trim() } : {}), lr: lr.trim() }
        : { busNo: busNo.trim(), driver: driver.trim(), driverMobile: driverMobile.trim() }),
      freightTerms,
      freightAmountPaise,
      callNote,
    });
    return `${order.soNo} dispatched — now in Dispatch.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.SALES_DISPATCH)) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Dispatch
      </Button>
      <ActionModal
        open={open}
        title={`Dispatch ${order.soNo} from Indore`}
        submitLabel="Dispatch"
        canSubmit={detailsOk && Number.isFinite(freightAmountPaise) && freightAmountPaise >= 0}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          This starts his 7-day window to confirm or complain, and tells him it has left.
        </p>
        <Select
          label="How it goes"
          value={mode}
          onChange={(event) => setMode(event.target.value as 'transport' | 'bus')}
        >
          <option value="transport">Transport (LR)</option>
          <option value="bus">Bus</option>
        </Select>
        {mode === 'transport' ? (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="LR number"
              required
              value={lr}
              onChange={(event) => setLr(event.target.value)}
            />
            <Input
              label="Transporter"
              value={transporter}
              onChange={(event) => setTransporter(event.target.value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Bus number"
              required
              value={busNo}
              onChange={(event) => setBusNo(event.target.value)}
            />
            <Input
              label="Driver"
              required
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
            />
            <Input
              label="Driver mobile"
              required
              value={driverMobile}
              onChange={(event) => setDriverMobile(event.target.value)}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Freight"
            value={freightTerms}
            onChange={(event) => setFreightTerms(event.target.value as 'prepaid' | 'to_pay')}
          >
            <option value="to_pay">To pay</option>
            <option value="prepaid">Prepaid</option>
          </Select>
          <Input
            label="Freight amount (₹)"
            type="number"
            step="0.01"
            min="0"
            value={freight}
            onChange={(event) => setFreight(event.target.value)}
          />
        </div>
      </ActionModal>
    </>
  );
}

/** Dispatch → Delivered: the buyer's confirmation of receipt, taken on a call. */
export function MarkDeliveredButton({
  order,
  onDone,
}: {
  order: SalesOrderRow;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await markOrderDelivered(token, order.soId, { callNote });
    return `${order.soNo} delivered.`;
  }, onDone);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Mark delivered
      </Button>
      <ActionModal
        open={open}
        title={`${order.soNo} reached him`}
        submitLabel="Mark delivered"
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          This is his own “I have it”, recorded for him. It closes the order and ends his 7-day
          window to complain — only do it once he has said so, and put that in the note.
        </p>
      </ActionModal>
    </>
  );
}

/** Payment pending → cancelled, before any money is posted. */
export function CancelOrderButton({ order, onDone }: { order: SalesOrderRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await cancelUnpaidOrder(token, order.soId, { callNote });
    return `${order.soNo} cancelled.`;
  }, onDone);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <ActionModal
        open={open}
        title={`Cancel ${order.soNo}`}
        submitLabel="Cancel order"
        danger
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          Only possible while no money is posted or claimed against it. Nothing is counted
          against him.
        </p>
      </ActionModal>
    </>
  );
}
