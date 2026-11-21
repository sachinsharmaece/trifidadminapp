import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { PasswordField } from '@/components/molecules/PasswordField';
import type { FormErrors } from '@/schemas/fields';
import { todayInIndia, validateMarginForm, type MarginFormValues } from '@/schemas/marginForm';
import { BUYER_TIERS, type BuyerTier } from '@/types/margin';
import { RATE_TIER_LABELS } from '@/types/party';
import { SKU_CLASSES, type SkuClass } from '@/types/product';
import { formatDate, formatPercent } from '@/utils/format';
import type { MarginCell } from './api';
import { useCreateMarginCell } from './hooks';

interface MarginFormProps {
  /** Every margin line, so the form can show what is in use now for the chosen class and tier. */
  cells: readonly MarginCell[];
  /** Start with this class and tier chosen (the box that was clicked in the grid). */
  skuClass?: SkuClass | undefined;
  buyerTier?: BuyerTier | undefined;
  onDone: () => void;
}

/**
 * Sets a new margin for one class and tier. The old line is kept: this adds a new one that starts today or on a
 * later date. Because margins are sensitive, the person types their password again to save.
 */
export function MarginForm({ cells, skuClass, buyerTier, onDone }: MarginFormProps) {
  const create = useCreateMarginCell();
  const [values, setValues] = useState<MarginFormValues>({
    skuClass: skuClass ?? '',
    buyerTier: buyerTier ?? '',
    marginPercent: '',
    startsOn: todayInIndia(),
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function setField(field: keyof MarginFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  const inUse = cells.find(
    (c) =>
      c.status === 'CURRENT' && c.skuClass === values.skuClass && c.buyerTier === values.buyerTier,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMarginForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.data, { onSuccess: onDone });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">Change a margin</h2>
      <p className="text-sm text-slate-600">
        This adds a new line that starts on the date you choose. The old line is kept in the
        history.
      </p>
      <ErrorAlert message={create.error?.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Pack class" required error={errors.skuClass}>
          {(field) => (
            <Select
              {...field}
              name="skuClass"
              value={values.skuClass}
              onChange={(event) => setField('skuClass', event.target.value)}
            >
              <option value="">Choose…</option>
              {SKU_CLASSES.map((value) => (
                <option key={value} value={value}>
                  Class {value}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Buyer tier" required error={errors.buyerTier}>
          {(field) => (
            <Select
              {...field}
              name="buyerTier"
              value={values.buyerTier}
              onChange={(event) => setField('buyerTier', event.target.value)}
            >
              <option value="">Choose…</option>
              {BUYER_TIERS.map((value) => (
                <option key={value} value={value}>
                  {RATE_TIER_LABELS[value]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Margin (%)"
          required
          error={errors.marginPercent}
          hint={
            inUse
              ? `In use now: ${formatPercent(inUse.marginBp)}, since ${formatDate(inUse.effectiveFrom)}.`
              : 'Added on top of the landed rate. For example 20 for 20%.'
          }
        >
          {(field) => (
            <Input
              {...field}
              name="marginPercent"
              inputMode="decimal"
              autoComplete="off"
              value={values.marginPercent}
              onChange={(event) => setField('marginPercent', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Starts on"
          required
          error={errors.startsOn}
          hint="Today means it starts right away. Choose a later date to plan a change."
        >
          {(field) => (
            <Input
              {...field}
              type="date"
              name="startsOn"
              min={todayInIndia()}
              value={values.startsOn}
              onChange={(event) => setField('startsOn', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Your password"
          required
          error={errors.password}
          hint="Type it again to confirm that it is you."
          className="sm:col-span-2"
        >
          {(field) => (
            <PasswordField
              {...field}
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => setField('password', event.target.value)}
            />
          )}
        </FormField>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={create.isPending}>
          Save margin
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
