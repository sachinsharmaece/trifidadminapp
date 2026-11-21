import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { ManufacturerChecklist } from '@/features/manufacturers/ManufacturerChecklist';
import type { TehsilSummary } from '@/features/tehsils/api';
import { TehsilPicker } from '@/features/tehsils/TehsilPicker';
import type { FormErrors } from '@/schemas/fields';
import { validateSellerForm, type SellerFormValues } from '@/schemas/sellerForm';
import { maskedAccount } from '@/utils/format';
import type { Seller } from './api';
import { useCreateSeller, useUpdateSeller } from './hooks';

interface SellerFormProps {
  /** Give the seller to edit it. Leave it out to add a new one. */
  seller?: Seller | undefined;
  onDone: () => void;
}

export function SellerForm({ seller, onDone }: SellerFormProps) {
  const create = useCreateSeller();
  const update = useUpdateSeller();
  // The account number box always starts empty: the saved number is never sent to the browser.
  const [values, setValues] = useState<SellerFormValues>({
    firmName: seller?.firmName ?? '',
    gstin: seller?.gstin ?? '',
    mobile: seller?.mobile ?? '',
    contactName: seller?.contactName ?? '',
    tehsilId: seller?.tehsil.id ?? '',
    address: seller?.address ?? '',
    dispatchCutoff: seller?.dispatchCutoff ?? '',
    manufacturerIds: seller?.manufacturerIds ?? [],
    accountNumber: '',
    ifsc: seller?.bank.ifsc ?? '',
    bankName: seller?.bank.bankName ?? '',
    holderName: seller?.bank.holderName ?? '',
  });
  const [tehsil, setTehsil] = useState<TehsilSummary | null>(seller?.tehsil ?? null);
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function setField(field: keyof SellerFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // When adding, the account number is required. When editing, empty means "keep the saved one".
    const result = validateSellerForm(
      { ...values, tehsilId: tehsil?.id ?? '' },
      seller !== undefined,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (seller) {
      update.mutate({ id: seller.id, changes: result.data }, { onSuccess: onDone });
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
      <h2 className="text-base font-semibold">
        {seller ? `Edit ${seller.number}` : 'Add a seller'}
      </h2>
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
          <FormField label="GSTIN" required error={errors.gstin}>
            {(field) => (
              <Input
                {...field}
                name="gstin"
                required
                autoCapitalize="characters"
                maxLength={15}
                value={values.gstin}
                onChange={(event) => setField('gstin', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Mobile" required error={errors.mobile}>
            {(field) => (
              <Input
                {...field}
                name="mobile"
                required
                inputMode="numeric"
                value={values.mobile}
                onChange={(event) => setField('mobile', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Contact person" error={errors.contactName}>
            {(field) => (
              <Input
                {...field}
                name="contactName"
                value={values.contactName}
                onChange={(event) => setField('contactName', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Tehsil" required error={errors.tehsilId}>
            {(field) => <TehsilPicker field={field} value={tehsil} onChange={setTehsil} />}
          </FormField>
          <FormField label="Address" error={errors.address}>
            {(field) => (
              <Input
                {...field}
                name="address"
                value={values.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="Dispatch cut-off time"
            required
            error={errors.dispatchCutoff}
            hint="Orders confirmed after this time are dispatched the next day."
          >
            {(field) => (
              <Input
                {...field}
                type="time"
                name="dispatchCutoff"
                required
                value={values.dispatchCutoff}
                onChange={(event) => setField('dispatchCutoff', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Dealer of</h3>
        <ManufacturerChecklist
          selected={values.manufacturerIds}
          onChange={(ids) => setValues((current) => ({ ...current, manufacturerIds: ids }))}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Bank account</h3>
          <p className="mt-1 text-sm text-slate-600">
            The account number is stored locked. After saving, only its last 4 digits are shown.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Account number"
            required={!seller}
            error={errors.accountNumber}
            hint={
              seller
                ? `Saved: ${maskedAccount(seller.bank.accountLast4)}. Leave this empty to keep it, or type a new number to replace it.`
                : '9 to 18 digits'
            }
            className="sm:col-span-2"
          >
            {(field) => (
              <Input
                {...field}
                name="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                value={values.accountNumber}
                onChange={(event) => setField('accountNumber', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="IFSC code" required error={errors.ifsc} hint="For example: HDFC0001234">
            {(field) => (
              <Input
                {...field}
                name="ifsc"
                required
                autoCapitalize="characters"
                maxLength={11}
                value={values.ifsc}
                onChange={(event) => setField('ifsc', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Bank name" required error={errors.bankName}>
            {(field) => (
              <Input
                {...field}
                name="bankName"
                required
                value={values.bankName}
                onChange={(event) => setField('bankName', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Account holder name" required error={errors.holderName}>
            {(field) => (
              <Input
                {...field}
                name="holderName"
                required
                value={values.holderName}
                onChange={(event) => setField('holderName', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {seller ? 'Save' : 'Add seller'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
