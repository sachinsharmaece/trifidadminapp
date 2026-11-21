import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { SkuPicker, type SkuChoice } from '@/features/products/SkuPicker';
import { SellerPicker, type SellerChoice } from '@/features/sellers/SellerPicker';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { FormErrors } from '@/schemas/fields';
import { validateListingForm, type ListingFormValues } from '@/schemas/listingForm';
import { formatRupees } from '@/utils/format';
import {
  EXPIRY_BANDS,
  EXPIRY_BAND_LABELS,
  LISTING_RATE_TYPES,
  PROVENANCES,
  PROVENANCE_LABELS,
  RATE_TYPE_LABELS,
} from '@/types/listing';
import { useCreateListing, useListingPreview } from './hooks';

interface ListingFormProps {
  onDone: () => void;
}

const EMPTY: ListingFormValues = {
  sellerId: '',
  skuId: '',
  rateType: 'FOR',
  ratePaisePerUnit: '',
  exRatePaisePerUnit: '',
  colPaisePerBox: '',
  expiryBand: '',
  moqBoxes: '',
  quantityBoxes: '',
  provenance: '',
};

/** Adds one offer from a seller. A listing is never edited later: withdraw it and add a new one. */
export function ListingForm({ onDone }: ListingFormProps) {
  const create = useCreateListing();
  const [values, setValues] = useState<ListingFormValues>(EMPTY);
  const [seller, setSeller] = useState<SellerChoice | null>(null);
  const [sku, setSku] = useState<SkuChoice | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  // Which lower rate the person agreed to ("58800>57000"). A different rate is a new question, so it starts unticked.
  const [confirmedDrop, setConfirmedDrop] = useState('');

  function setField(field: keyof ListingFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // Quietly check the form on every change. Once it is complete, ask the server what the offer comes to.
  const checked = useMemo(
    () => validateListingForm({ ...values, sellerId: seller?.id ?? '', skuId: sku?.id ?? '' }),
    [values, seller, sku],
  );
  const complete = checked.ok ? checked.data : null;
  // Wait until typing pauses before asking the server.
  const offer = useDebouncedValue(complete, 400);
  const preview = useListingPreview(offer);
  // The answer counts only when it is for what is on the screen right now (not for the values from a moment ago).
  const upToDate = complete !== null && offer === complete;
  const shown = upToDate && preview.isSuccess ? preview.data : null;

  const dropKey = shown?.decrease
    ? `${shown.decrease.fromPaisePerUnit}>${shown.decrease.toPaisePerUnit}`
    : null;
  const dropConfirmed = dropKey !== null && confirmedDrop === dropKey;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    if (shown === null) {
      setErrors({ form: 'The rate has not been checked yet. Wait a moment, then save again.' });
      return;
    }
    if (shown.decrease && !dropConfirmed) {
      setErrors({ confirmDecrease: 'Tick the box to confirm the lower rate.' });
      return;
    }
    create.mutate(
      { ...checked.data, ...(shown.decrease ? { confirmDecrease: true } : {}) },
      {
        onSuccess: onDone,
        // Someone else may have saved a twin in the meantime: look again so the screen tells the truth.
        onError: () => void preview.refetch(),
      },
    );
  }

  const isEx = values.rateType === 'EX';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">Add a listing</h2>
      <ErrorAlert message={create.error?.message ?? errors.form} />

      <section className="grid gap-4 sm:grid-cols-2">
        <FormField label="Seller" required error={errors.sellerId}>
          {(field) => <SellerPicker field={field} value={seller} onChange={setSeller} />}
        </FormField>
        <FormField label="Product pack" required error={errors.skuId}>
          {(field) => <SkuPicker field={field} value={sku} onChange={setSku} />}
        </FormField>
      </section>

      <section className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">How the seller quotes</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {LISTING_RATE_TYPES.map((rateType) => (
              <label key={rateType} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="rateType"
                  value={rateType}
                  checked={values.rateType === rateType}
                  onChange={() => setField('rateType', rateType)}
                />
                {RATE_TYPE_LABELS[rateType]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEx && (
            <FormField
              label="Rate per unit (₹)"
              required
              error={errors.ratePaisePerUnit}
              hint="The price per unit delivered to Indore."
            >
              {(field) => (
                <Input
                  {...field}
                  name="ratePaisePerUnit"
                  inputMode="decimal"
                  autoComplete="off"
                  value={values.ratePaisePerUnit}
                  onChange={(event) => setField('ratePaisePerUnit', event.target.value)}
                />
              )}
            </FormField>
          )}
          {isEx && (
            <>
              <FormField label="Ex rate per unit (₹)" required error={errors.exRatePaisePerUnit}>
                {(field) => (
                  <Input
                    {...field}
                    name="exRatePaisePerUnit"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.exRatePaisePerUnit}
                    onChange={(event) => setField('exRatePaisePerUnit', event.target.value)}
                  />
                )}
              </FormField>
              <FormField
                label="COL per box (₹)"
                required
                error={errors.colPaisePerBox}
                hint="Spread over the units in a box and added to the Ex rate."
              >
                {(field) => (
                  <Input
                    {...field}
                    name="colPaisePerBox"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.colPaisePerBox}
                    onChange={(event) => setField('colPaisePerBox', event.target.value)}
                  />
                )}
              </FormField>
            </>
          )}
          <FormField label="Shelf life left" required error={errors.expiryBand}>
            {(field) => (
              <Select
                {...field}
                name="expiryBand"
                value={values.expiryBand}
                onChange={(event) => setField('expiryBand', event.target.value)}
              >
                <option value="">Choose…</option>
                {EXPIRY_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {EXPIRY_BAND_LABELS[band]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Goods come from" required error={errors.provenance}>
            {(field) => (
              <Select
                {...field}
                name="provenance"
                value={values.provenance}
                onChange={(event) => setField('provenance', event.target.value)}
              >
                <option value="">Choose…</option>
                {PROVENANCES.map((provenance) => (
                  <option key={provenance} value={provenance}>
                    {PROVENANCE_LABELS[provenance]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField
            label="Minimum order (boxes)"
            required
            error={errors.moqBoxes}
            hint="The smallest number of boxes the seller will sell."
          >
            {(field) => (
              <Input
                {...field}
                name="moqBoxes"
                inputMode="numeric"
                autoComplete="off"
                value={values.moqBoxes}
                onChange={(event) => setField('moqBoxes', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="Quantity available (boxes)"
            required
            error={errors.quantityBoxes}
            hint="For information. It is not reduced when orders are placed."
          >
            {(field) => (
              <Input
                {...field}
                name="quantityBoxes"
                inputMode="numeric"
                autoComplete="off"
                value={values.quantityBoxes}
                onChange={(event) => setField('quantityBoxes', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <section aria-live="polite" className="space-y-3 rounded-md bg-slate-50 p-4 text-sm">
        <h3 className="font-semibold text-slate-700">What this comes to</h3>
        {complete === null && (
          <p className="text-slate-500">
            Fill in the seller, pack, rate, shelf life, source and quantities to see the box value.
          </p>
        )}
        {complete !== null && shown === null && !(upToDate && preview.isError) && (
          <p className="text-slate-500">Checking…</p>
        )}
        {upToDate && preview.isError && <ErrorAlert message={preview.error.message} />}
        {shown && (
          <>
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Rate per unit (landed)</dt>
                <dd className="font-medium">{formatRupees(shown.landedPaisePerUnit)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">One box ({shown.unitsPerBox} units)</dt>
                <dd className="font-medium">{formatRupees(shown.boxValuePaise)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Minimum order ({offer?.moqBoxes} boxes)</dt>
                <dd className="font-medium">{formatRupees(shown.lotValuePaise)}</dd>
              </div>
            </dl>

            {shown.duplicate && (
              <p role="alert" className="rounded-md bg-red-50 p-3 font-medium text-red-700">
                This seller already has the same offer live. Change the rate, minimum order, shelf
                life or source, or withdraw the old listing first.
              </p>
            )}

            {shown.decrease && (
              <div className="space-y-2 rounded-md bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">
                  This rate is {(shown.decrease.pctBp / 100).toFixed(2)}% lower than this
                  seller&apos;s last live rate for this pack (
                  {formatRupees(shown.decrease.fromPaisePerUnit)} to{' '}
                  {formatRupees(shown.decrease.toPaisePerUnit)} per unit).
                </p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dropConfirmed}
                    onChange={(event) =>
                      setConfirmedDrop(event.target.checked ? (dropKey ?? '') : '')
                    }
                  />
                  Yes, the lower rate is correct
                </label>
                {errors.confirmDecrease && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {errors.confirmDecrease}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <div className="flex gap-2">
        <Button type="submit" loading={create.isPending} disabled={shown?.duplicate === true}>
          Add listing
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
