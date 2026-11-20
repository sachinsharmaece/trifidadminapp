import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { validateCompanyForm, type CompanyFormValues } from '@/schemas/companyForm';
import type { FormErrors } from '@/schemas/fields';
import { maskedAccount } from '@/utils/format';
import type { Company } from './api';
import { useSaveCompany } from './hooks';

interface CompanyFormProps {
  /** What is saved now, or null when the company has not been set up yet. */
  company: Company | null;
}

/** The account number box always starts empty: the saved number is never sent to the browser. */
function toValues(company: Company | null): CompanyFormValues {
  return {
    name: company?.name ?? '',
    gstin: company?.gstin ?? '',
    address: company?.address ?? '',
    accountNumber: '',
    ifsc: company?.bank.ifsc ?? '',
    bankName: company?.bank.bankName ?? '',
  };
}

export function CompanyForm({ company }: CompanyFormProps) {
  const save = useSaveCompany();
  const [values, setValues] = useState(() => toValues(company));
  const [errors, setErrors] = useState<FormErrors>({});

  function setField(name: keyof CompanyFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (save.isSuccess) save.reset(); // hide the old "Saved" message once the person edits again
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCompanyForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // Show what the server saved (tidied) and empty the account number box again.
    save.mutate(result.data, { onSuccess: (saved) => setValues(toValues(saved)) });
  }

  const savedLast4 = company?.bank.accountLast4 ?? null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
    >
      <ErrorAlert message={save.error?.message} />

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name" required error={errors.name}>
            {(field) => (
              <Input
                {...field}
                name="name"
                required
                autoFocus
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="GSTIN"
            required
            error={errors.gstin}
            hint={
              company
                ? `State code ${company.stateCode} is taken from the first 2 digits.`
                : 'The state code is taken from the first 2 digits.'
            }
          >
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
          <FormField label="Address" required error={errors.address} className="sm:col-span-2">
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
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Bank account</h2>
          <p className="mt-1 text-sm text-slate-600">
            The account number is stored locked. After saving, only its last 4 digits are shown.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Account number"
            error={errors.accountNumber}
            hint={
              savedLast4
                ? `Saved: ${maskedAccount(savedLast4)}. Leave this empty to keep it, or type a new number to replace it.`
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
          <FormField label="IFSC code" error={errors.ifsc} hint="For example: ICIC0001234">
            {(field) => (
              <Input
                {...field}
                name="ifsc"
                autoCapitalize="characters"
                maxLength={11}
                value={values.ifsc}
                onChange={(event) => setField('ifsc', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Bank name" error={errors.bankName}>
            {(field) => (
              <Input
                {...field}
                name="bankName"
                value={values.bankName}
                onChange={(event) => setField('bankName', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending}>
          Save
        </Button>
        {save.isSuccess && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
