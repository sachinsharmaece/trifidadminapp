import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import type { BuyerChoice } from '@/features/buyers/BuyerPicker';
import { SkuPicker, type SkuChoice } from '@/features/products/SkuPicker';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateAsk, type AskValues } from '@/schemas/tradeForms';
import { ASK_REASONS, ASK_REASON_LABELS } from '@/types/trade';
import { ActionFormShell } from './ActionFormShell';
import type { Trade } from './api';
import { useCreateAsk } from './hooks';

interface AskFormProps {
  buyer: BuyerChoice;
  onCancel: () => void;
  onCreated: (trade: Trade) => void;
}

/**
 * Sales records what a buyer wants that is not on the board. It becomes a trade at b2; "Send to seller" then
 * sends it to Purchase to find a seller and record a quote.
 */
export function AskForm({ buyer, onCancel, onCreated }: AskFormProps) {
  const create = useCreateAsk();
  const [sku, setSku] = useState<SkuChoice | null>(null);
  const [anyPack, setAnyPack] = useState(false);
  const [values, setValues] = useState<AskValues>({ boxes: '', reason: '', note: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof AskValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateAsk(values);
    const errs: FormErrors = result.ok ? {} : { ...result.errors };
    if (!sku) errs.product = 'Choose the product (and pack)';
    if (!result.ok || !sku) return setErrors(errs);
    setErrors({});
    create.mutate(
      {
        buyerId: buyer.id,
        productId: sku.productId,
        ...(anyPack ? {} : { skuId: sku.id }),
        ...result.data,
      },
      { onSuccess: onCreated, onError: (e) => setErrors(serverFieldErrors(e)) },
    );
  }

  return (
    <ActionFormShell
      title={`Ask for an item not listed · ${buyer.firmName}`}
      description="Purchase will look for a seller. Purchase reads the note but never sees the buyer's name: do not write it in the note."
      submitLabel="Save ask"
      pending={create.isPending}
      error={create.error?.message}
      onSubmit={submit}
      onCancel={onCancel}
    >
      <FormField
        label="Product and pack"
        required
        error={errors.product ?? errors.productId ?? errors.skuId}
        className="max-w-xl"
      >
        {(field) => <SkuPicker field={field} value={sku} onChange={setSku} />}
      </FormField>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={anyPack}
          onChange={(event) => setAnyPack(event.target.checked)}
        />
        Any pack of this product (Purchase picks the pack)
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Boxes" required error={errors.boxes}>
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
        <FormField label="Why he asks" required error={errors.reason}>
          {(field) => (
            <Select
              {...field}
              value={values.reason}
              onChange={(event) => set('reason', event.target.value)}
            >
              <option value="">Choose…</option>
              {ASK_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {ASK_REASON_LABELS[reason]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Note"
          required={values.reason === 'OTHER'}
          error={errors.note}
          hint="Expiry, batch or other conditions."
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
