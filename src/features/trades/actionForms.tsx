import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField, type FieldControlProps } from '@/components/molecules/FormField';
import { useProduct } from '@/features/products/hooks';
import { SellerPicker, type SellerChoice } from '@/features/sellers/SellerPicker';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import {
  validateConfirmStock,
  validateDecline,
  validateQuote,
  validateWantIt,
  type ConfirmStockValues,
  type DeclineValues,
  type QuoteValues,
} from '@/schemas/tradeForms';
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
