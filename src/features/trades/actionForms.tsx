import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField, type FieldControlProps } from '@/components/molecules/FormField';
import { useCurrentUser } from '@/features/auth/hooks';
import { useBankAccounts } from '@/features/bankAccounts/hooks';
import { useProduct } from '@/features/products/hooks';
import { useReasonCodes } from '@/features/reasonCodes/hooks';
import { SellerPicker, type SellerChoice } from '@/features/sellers/SellerPicker';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import {
  validateConfirmStock,
  validateDecline,
  validatePayment,
  validatePaymentChoice,
  validateQuote,
  validateReason,
  validateWantIt,
  type ConfirmStockValues,
  type DeclineValues,
  type PaymentChoiceValues,
  type PaymentValues,
  type QuoteValues,
  type ReasonValues,
} from '@/schemas/tradeForms';
import { CONTEXT_LABELS } from '@/types/reasonCode';
import { formatRupees, paiseToRupeesText, todayInIndia } from '@/utils/format';
import { DECLINE_REASONS, DECLINE_REASON_LABELS } from '@/types/trade';
import { ActionFormShell } from './ActionFormShell';
import type { Trade } from './api';
import { useTradeAction } from './hooks';

/**
 * One small form per deal-card button. Each presses one engine action; the server checks the same rules again
 * and its field messages are shown under the fields.
 */
export interface ActionFormProps {
  trade: Trade;
  onDone: () => void;
  /** Someone else acted on the trade first, so this press was not saved. */
  onChangedByOthers: () => void;
}

/** The month field: `<input type="month">` gives "YYYY-MM", which is what the API wants. */
function MonthInput(props: {
  field: FieldControlProps;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      {...props.field}
      type="month"
      placeholder="YYYY-MM"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

/** b1 → b2: how many boxes the buyer wants. */
export function WantItForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'wantIt', onChangedByOthers);
  const moq = trade.boardOffer?.moqBoxes;
  const [boxes, setBoxes] = useState(moq ? String(moq) : '');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateWantIt({ boxes });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (e) => setErrors(serverFieldErrors(e)),
    });
  }

  return (
    <ActionFormShell
      title="He wants it"
      description="Record how many boxes the buyer wants. Next, send it to the seller."
      submitLabel="Save"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <FormField
        label="Boxes"
        required
        error={errors.boxes}
        hint={moq ? `Minimum order: ${moq} boxes.` : undefined}
        className="max-w-xs"
      >
        {(field) => (
          <Input
            {...field}
            inputMode="numeric"
            autoComplete="off"
            value={boxes}
            onChange={(event) => setBoxes(event.target.value)}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}

/** b2 → b3: no fields, just confirm where it goes. */
export function SendToSellerForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'sendToSeller', onChangedByOthers);
  const live = trade.boardOffer?.live ?? false;
  return (
    <ActionFormShell
      title="Send to seller"
      description={
        live
          ? `Purchase asks the listed seller to confirm ${trade.boxesWanted ?? 0} boxes.`
          : `Purchase finds a seller for ${trade.boxesWanted ?? 0} boxes and records his quote.`
      }
      submitLabel="Send"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}

/** s1 (buyer b3 → b4): the listed seller confirms. */
export function ConfirmStockForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'confirmStock', onChangedByOthers);
  const ownStock = trade.listing?.provenance === 'OWN_STOCK';
  const [values, setValues] = useState<ConfirmStockValues>({
    boxes: trade.boxesWanted ? String(trade.boxesWanted) : '',
    expiryMonth: '',
    batchNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof ConfirmStockValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateConfirmStock(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (e) => setErrors(serverFieldErrors(e)),
    });
  }

  return (
    <ActionFormShell
      title="Seller confirms"
      description="What the seller confirmed on the call. The buyer's rate is fixed now and the seller's hold clock starts."
      submitLabel="Save confirmation"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Boxes confirmed"
          required
          error={errors.boxes}
          hint={`The buyer wants ${trade.boxesWanted ?? 0}.`}
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={values.boxes}
              onChange={(event) => set('boxes', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Expiry month" required error={errors.expiryMonth}>
          {(field) => (
            <MonthInput
              field={field}
              value={values.expiryMonth}
              onChange={(value) => set('expiryMonth', value)}
            />
          )}
        </FormField>
        <FormField
          label="Batch number"
          required={ownStock}
          error={errors.batchNumber}
          hint={ownStock ? 'Needed: this is the seller’s own stock.' : 'If the seller gave one.'}
        >
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.batchNumber}
              onChange={(event) => set('batchNumber', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** s1 closes, buyer back to b2: the seller cannot supply. */
export function DeclineStockForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'declineStock', onChangedByOthers);
  const navigate = useNavigate();
  const [values, setValues] = useState<DeclineValues>({ reason: '', note: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof DeclineValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateDecline(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      // The trade goes back to Sales and leaves the seller side, so Purchase returns to its queue.
      onSuccess: () => void navigate('/seller-funnels'),
      onError: (e) => setErrors(serverFieldErrors(e)),
    });
  }

  return (
    <ActionFormShell
      title="Seller declines"
      description="The trade goes back to Sales. If Sales sends it again, it comes to you to find another seller."
      submitLabel="Save"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Reason" required error={errors.reason}>
          {(field) => (
            <Select
              {...field}
              value={values.reason}
              onChange={(event) => set('reason', event.target.value)}
            >
              <option value="">Choose…</option>
              {DECLINE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {DECLINE_REASON_LABELS[reason]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Note"
          required={values.reason === 'OTHER'}
          error={errors.note}
          hint="Sales reads this note: do not name the seller."
        >
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.note}
              onChange={(event) => set('note', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** s0 → s1 (buyer b3 → b4): Purchase found a seller for an item that was not listed. */
export function QuoteForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'giveQuote', onChangedByOthers);
  const product = useProduct(trade.product.id);
  const [seller, setSeller] = useState<SellerChoice | null>(null);
  const [values, setValues] = useState<QuoteValues>({
    skuId: trade.pack?.id ?? '',
    landedRupees: '',
    expiryMonth: '',
    moqBoxes: '',
    boxesAvailable: '',
    batchNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof QuoteValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  // The buyer asked for a pack: only that one. Otherwise any active pack of the product.
  const packs = trade.pack ? [trade.pack] : (product.data?.skus.filter((sku) => sku.active) ?? []);

  function submit() {
    const result = validateQuote(values);
    const errs: FormErrors = result.ok ? {} : { ...result.errors };
    if (!seller) errs.sellerId = 'Choose the seller';
    if (!result.ok || !seller) return setErrors(errs);
    setErrors({});
    const { landedRupees, ...rest } = result.data;
    action.mutate(
      { ...rest, landedPaisePerUnit: landedRupees, sellerId: seller.id },
      {
        onSuccess: onDone,
        onError: (e) => {
          const server = serverFieldErrors(e);
          setErrors({ ...server, landedRupees: server.landedPaisePerUnit });
        },
      },
    );
  }

  return (
    <ActionFormShell
      title="Record the quote"
      description={`The seller's offer for ${trade.boxesWanted ?? 0} boxes. The buyer is offered the smaller of what he wants and what the seller has.`}
      submitLabel="Save quote"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <FormField label="Seller" required error={errors.sellerId} className="max-w-md">
        {(field) => <SellerPicker field={field} value={seller} onChange={setSeller} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Pack" required error={errors.skuId}>
          {(field) => (
            <Select
              {...field}
              value={values.skuId}
              onChange={(event) => set('skuId', event.target.value)}
            >
              <option value="">Choose…</option>
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.packLabel} ({pack.unitsPerBox} per box)
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Landed rate per unit (₹)"
          required
          error={errors.landedRupees}
          hint="Delivered to Indore."
        >
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              autoComplete="off"
              value={values.landedRupees}
              onChange={(event) => set('landedRupees', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Expiry month" required error={errors.expiryMonth}>
          {(field) => (
            <MonthInput
              field={field}
              value={values.expiryMonth}
              onChange={(value) => set('expiryMonth', value)}
            />
          )}
        </FormField>
        <FormField label="Minimum order (boxes)" required error={errors.moqBoxes}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={values.moqBoxes}
              onChange={(event) => set('moqBoxes', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Boxes available" required error={errors.boxesAvailable}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={values.boxesAvailable}
              onChange={(event) => set('boxesAvailable', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Batch number" error={errors.batchNumber} hint="If the seller gave one.">
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.batchNumber}
              onChange={(event) => set('batchNumber', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** b4 → b5: Sales tells the buyer the offer (call or WhatsApp), then waits for his answer. */
export function SendToBuyerForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'sendToBuyer', onChangedByOthers);
  const offer = trade.offer;
  const rate = offer?.buyerRatePaisePerUnit ?? null;
  return (
    <ActionFormShell
      title="Send to buyer"
      description={
        offer && rate !== null && offer.boxValuePaise !== null
          ? `Tell the buyer: ${offer.boxes} boxes at ${formatRupees(rate)} a unit (${formatRupees(offer.boxValuePaise)} a box), expiry ${offer.expiryMonth}. Then wait for his answer; the seller holds the stock meanwhile.`
          : 'There was no rate when the seller answered: it is worked out now from the margin matrix. Then wait for his answer.'
      }
      submitLabel="Mark as sent"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}

/** b5 → b6: the buyer says yes. The engine raises his sales order and the payment clock starts. */
export function BuyerYesForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'buyerYes', onChangedByOthers);
  const offer = trade.offer;
  const total =
    offer && offer.boxValuePaise !== null ? formatRupees(offer.boxValuePaise * offer.boxes) : '';
  return (
    <ActionFormShell
      title="Buyer says yes"
      description={`Raises his sales order${offer ? ` for ${offer.boxes} boxes` : ''}${total ? `, ${total} including GST` : ''}. The payment clock starts and the seller holds the stock until he pays.`}
      submitLabel="Raise the order"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}

/** A reason from the master (only this context's, turned on) plus a note: "Buyer says no" and "drops the order". */
function ReasonForm(props: {
  context: 'BUYER_NO' | 'B6_LEAK';
  title: string;
  description: string;
  submitLabel: string;
  pending: boolean;
  error: string | undefined;
  serverErrors: FormErrors;
  onSave: (values: { reasonCodeId: string; note?: string | undefined }) => void;
  onCancel: () => void;
}) {
  const reasons = useReasonCodes();
  const choices = (reasons.data ?? []).filter(
    (reason) => reason.context === props.context && reason.active,
  );
  const [values, setValues] = useState<ReasonValues>({ reasonCodeId: '', note: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const shown = { ...errors, ...props.serverErrors };
  const set = (field: keyof ReasonValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateReason(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    props.onSave(result.data);
  }

  return (
    <ActionFormShell
      title={props.title}
      description={props.description}
      submitLabel={props.submitLabel}
      pending={props.pending}
      error={props.error}
      onSubmit={submit}
      onCancel={props.onCancel}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Reason"
          required
          error={shown.reasonCodeId}
          hint={
            reasons.isSuccess && choices.length === 0
              ? `No reasons yet: Founder or Admin adds them under Reason codes ("${CONTEXT_LABELS[props.context]}").`
              : undefined
          }
        >
          {(field) => (
            <Select
              {...field}
              value={values.reasonCodeId}
              onChange={(event) => set('reasonCodeId', event.target.value)}
            >
              <option value="">Choose…</option>
              {choices.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Note" error={shown.note} hint="Optional. Purchase does not see it.">
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.note}
              onChange={(event) => set('note', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** b5 → Leakage: the buyer says no. The seller's hold ends. */
export function BuyerNoForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'buyerNo', onChangedByOthers);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});
  return (
    <ReasonForm
      context="BUYER_NO"
      title="Buyer says no"
      description="The trade is lost (Leakage) and the seller may sell the stock to someone else. You can reopen it later."
      submitLabel="Save"
      pending={action.isPending}
      error={action.error?.message}
      serverErrors={serverErrors}
      onSave={(input) =>
        action.mutate(input, {
          onSuccess: onDone,
          onError: (e) => setServerErrors(serverFieldErrors(e)),
        })
      }
      onCancel={onDone}
    />
  );
}

/** b6 → Leakage: the buyer drops the order before paying. His sales order is cancelled. */
export function LeakAfterOrderForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'leakAfterOrder', onChangedByOthers);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});
  return (
    <ReasonForm
      context="B6_LEAK"
      title="Buyer drops the order"
      description={`Cancels ${trade.salesOrder?.number ?? 'the sales order'} and ends the seller's hold. The trade is lost (Leakage); you can reopen it later.`}
      submitLabel="Cancel the order"
      pending={action.isPending}
      error={action.error?.message}
      serverErrors={serverErrors}
      onSave={(input) =>
        action.mutate(input, {
          onSuccess: onDone,
          onError: (e) => setServerErrors(serverFieldErrors(e)),
        })
      }
      onCancel={onDone}
    />
  );
}

/** Leakage → b2: the buyer is interested again. */
export function ReopenForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'reopen', onChangedByOthers);
  return (
    <ActionFormShell
      title="Reopen"
      description={`Brings the trade back to b2 for ${trade.boxesWanted ?? 0} boxes. Send it to the seller again when the buyer is ready; a cancelled order stays on record.`}
      submitLabel="Reopen"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}

/**
 * b6: Sales enters what the buyer says he paid. It is not money until Accounts finds it in the bank, so the
 * trade stays at b6. The amount starts at what is still open (due − payments already entered).
 */
export function EnterPaymentForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'enterPayment', onChangedByOthers);
  const banks = useBankAccounts(true);
  const open = trade.openPaise ?? 0;
  const [values, setValues] = useState<PaymentValues>({
    bankLedgerId: '',
    utr: '',
    amount: open > 0 ? paiseToRupeesText(open) : '',
    receivedOn: todayInIndia(),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof PaymentValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validatePayment(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (e) => setErrors(serverFieldErrors(e)),
    });
  }

  return (
    <ActionFormShell
      title="Enter payment"
      description={`What the buyer says he paid. It counts only when Accounts finds it in the bank. Due: ${formatRupees(trade.balanceDuePaise ?? 0)}; still to enter: ${formatRupees(open)}.`}
      submitLabel="Save payment"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Our bank account"
          required
          error={errors.bankLedgerId}
          hint={
            banks.isSuccess && banks.data.length === 0
              ? 'No bank accounts yet: Founder or Admin adds them under Bank accounts.'
              : undefined
          }
        >
          {(field) => (
            <Select
              {...field}
              value={values.bankLedgerId}
              onChange={(event) => set('bankLedgerId', event.target.value)}
            >
              <option value="">Choose…</option>
              {(banks.data ?? []).map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="UTR"
          required
          error={errors.utr}
          hint="The bank reference the buyer gave."
        >
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.utr}
              onChange={(event) => set('utr', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Amount (₹)" required error={errors.amountPaise ?? errors.amount}>
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Received on" required error={errors.receivedOn}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.receivedOn}
              onChange={(event) => set('receivedOn', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/**
 * Accounts' two buttons, on the deal card (for Founder and Admin, who may press them too; Accounts uses its
 * "Payments to confirm" queue). Only payments waiting for Accounts and NOT entered by this person are offered.
 */
function PaymentChoiceForm(props: ActionFormProps & { reject: boolean }) {
  const { trade, onDone, onChangedByOthers, reject } = props;
  const confirm = useTradeAction(trade, 'confirmPayment', onChangedByOthers);
  const markNotReceived = useTradeAction(trade, 'rejectPayment', onChangedByOthers);
  const action = reject ? markNotReceived : confirm;
  const { data: me } = useCurrentUser();
  const waiting = (trade.payments ?? []).filter(
    (payment) => payment.status === 'LOGGED' && payment.enteredById !== me?.id,
  );
  const [values, setValues] = useState<PaymentChoiceValues>({
    receiptId: waiting.length === 1 ? (waiting[0]?.id ?? '') : '',
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validatePaymentChoice(values, reject);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    const done = { onSuccess: onDone, onError: (e: unknown) => setErrors(serverFieldErrors(e)) };
    if (reject) markNotReceived.mutate(result.data, done);
    else confirm.mutate({ receiptId: result.data.receiptId }, done);
  }

  return (
    <ActionFormShell
      title={reject ? 'Payment not received' : 'Confirm payment'}
      description={
        waiting.length === 0
          ? 'No payment is waiting for you: you cannot confirm or reject one you entered yourself.'
          : reject
            ? 'The money is not in the bank. Sales sees your note and can enter it again.'
            : 'Posts it to the books (Dr our bank · Cr the buyer). Once the order is paid in full, the PO goes to the seller.'
      }
      submitLabel={reject ? 'Mark not received' : 'Confirm payment'}
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment" required error={errors.receiptId}>
          {(field) => (
            <Select
              {...field}
              value={values.receiptId}
              onChange={(event) => setValues((v) => ({ ...v, receiptId: event.target.value }))}
            >
              <option value="">Choose…</option>
              {waiting.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.number} · {formatRupees(payment.amountPaise)} · UTR {payment.utr}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {reject && (
          <FormField label="What was wrong" required error={errors.note}>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                value={values.note}
                onChange={(event) => setValues((v) => ({ ...v, note: event.target.value }))}
              />
            )}
          </FormField>
        )}
      </div>
    </ActionFormShell>
  );
}

export function ConfirmPaymentForm(props: ActionFormProps) {
  return <PaymentChoiceForm {...props} reject={false} />;
}

export function RejectPaymentForm(props: ActionFormProps) {
  return <PaymentChoiceForm {...props} reject />;
}
