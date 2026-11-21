import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { ManufacturerChecklist } from '@/features/manufacturers/ManufacturerChecklist';
import type { TehsilSummary } from '@/features/tehsils/api';
import { TehsilPicker } from '@/features/tehsils/TehsilPicker';
import { validateBuyerForm, type BuyerFormValues } from '@/schemas/buyerForm';
import type { FormErrors } from '@/schemas/fields';
import { RATE_TIER_LABELS, TRADE_POSITIONS } from '@/types/party';
import type { Buyer } from './api';
import { useCreateBuyer, useUpdateBuyer } from './hooks';

interface BuyerFormProps {
  /** Give the buyer to edit it. Leave it out to add a new one. */
  buyer?: Buyer | undefined;
  onDone: () => void;
}

type TextField = Exclude<keyof BuyerFormValues, 'traderFlag' | 'manufacturerIds'>;

export function BuyerForm({ buyer, onDone }: BuyerFormProps) {
  const create = useCreateBuyer();
  const update = useUpdateBuyer();
  const [values, setValues] = useState<BuyerFormValues>({
    firmName: buyer?.firmName ?? '',
    contactName: buyer?.contactName ?? '',
    mobiles: buyer?.mobiles.join(', ') ?? '',
    gstin: buyer?.gstin ?? '',
    tehsilId: buyer?.tehsil.id ?? '',
    village: buyer?.village ?? '',
    address: buyer?.address ?? '',
    deliveryLocation: buyer?.deliveryLocation ?? '',
    tradePosition: buyer?.tradePosition ?? '',
    traderFlag: buyer?.traderFlag ?? false,
    manufacturerIds: buyer?.manufacturerIds ?? [],
  });
  const [tehsil, setTehsil] = useState<TehsilSummary | null>(buyer?.tehsil ?? null);
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function setField(field: TextField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateBuyerForm({ ...values, tehsilId: tehsil?.id ?? '' });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (buyer) {
      update.mutate({ id: buyer.id, changes: result.data }, { onSuccess: onDone });
    } else {
      create.mutate(result.data, { onSuccess: onDone });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">{buyer ? `Edit ${buyer.number}` : 'Add a buyer'}</h2>
      <ErrorAlert message={serverError} />

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Firm</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Firm name" required error={errors.firmName}>
            {(field) => (
              <Input
                {...field}
                name="firmName"
                required
                autoFocus
                value={values.firmName}
                onChange={(event) => setField('firmName', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Contact person" required error={errors.contactName}>
            {(field) => (
              <Input
                {...field}
                name="contactName"
                required
                value={values.contactName}
                onChange={(event) => setField('contactName', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="Mobile numbers"
            required
            error={errors.mobiles}
            hint="Up to 5, separated by commas, like 9826011111, 9000000010"
          >
            {(field) => (
              <Input
                {...field}
                name="mobiles"
                required
                inputMode="numeric"
                value={values.mobiles}
                onChange={(event) => setField('mobiles', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="GSTIN"
            error={errors.gstin}
            hint="Leave empty for a consumer. The state is then taken from the tehsil."
          >
            {(field) => (
              <Input
                {...field}
                name="gstin"
                autoCapitalize="characters"
                maxLength={15}
                value={values.gstin}
                onChange={(event) => setField('gstin', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Place</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tehsil" required error={errors.tehsilId}>
            {(field) => <TehsilPicker field={field} value={tehsil} onChange={setTehsil} />}
          </FormField>
          <FormField label="Village" error={errors.village}>
            {(field) => (
              <Input
                {...field}
                name="village"
                value={values.village}
                onChange={(event) => setField('village', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Address" required error={errors.address}>
            {(field) => (
              <Input
                {...field}
                name="address"
                required
                value={values.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Delivery location" required error={errors.deliveryLocation}>
            {(field) => (
              <Input
                {...field}
                name="deliveryLocation"
                required
                value={values.deliveryLocation}
                onChange={(event) => setField('deliveryLocation', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Rates</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Trade position" required error={errors.tradePosition}>
            {(field) => (
              <Select
                {...field}
                name="tradePosition"
                required
                value={values.tradePosition}
                onChange={(event) => setField('tradePosition', event.target.value)}
              >
                <option value="">Choose…</option>
                {TRADE_POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {RATE_TIER_LABELS[position]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="traderFlag"
                className="mt-1"
                checked={values.traderFlag}
                onChange={(event) =>
                  setValues((current) => ({ ...current, traderFlag: event.target.checked }))
                }
              />
              <span>
                <span className="font-medium text-slate-900">Trader</span>
                <span className="block text-xs text-slate-500">
                  A trader gets trader rates, whatever the trade position is.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Dealer of</h3>
        <ManufacturerChecklist
          selected={values.manufacturerIds}
          onChange={(ids) => setValues((current) => ({ ...current, manufacturerIds: ids }))}
        />
      </section>

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {buyer ? 'Save' : 'Add buyer'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
