import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import { validateBankAccountForm, type BankAccountFormValues } from '@/schemas/bankAccountForm';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { BANK_KIND_LABELS, BANK_KINDS } from '@/types/books';
import type { BankAccount } from './api';
import { useCreateBankAccount, useUpdateBankAccount } from './hooks';

interface BankAccountFormProps {
  /** Give the account to edit it. Leave it out to add a new one. */
  account?: BankAccount | undefined;
  onDone: () => void;
}

/** Add or edit one of our bank accounts. The full number is sent once and never shown again (last 4 only). */
export function BankAccountForm({ account, onDone }: BankAccountFormProps) {
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const [values, setValues] = useState<BankAccountFormValues>({
    name: account?.name ?? '',
    kind: account?.kind ?? 'CURRENT',
    bankName: account?.bankName ?? '',
    ifsc: account?.ifsc ?? '',
    accountNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof BankAccountFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateBankAccountForm(values, !account);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    const done = { onSuccess: onDone, onError: (e: unknown) => setErrors(serverFieldErrors(e)) };
    if (account) update.mutate({ account, changes: result.data }, done);
    else create.mutate(result.data, done);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">
        {account ? `Edit ${account.name}` : 'Add a bank account'}
      </h2>
      <ErrorAlert message={create.error?.message ?? update.error?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" required error={errors.name} hint="How people will see it.">
          {(field) => (
            <Input
              {...field}
              autoFocus
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Kind" required error={errors.kind}>
          {(field) => (
            <Select
              {...field}
              value={values.kind}
              onChange={(event) => set('kind', event.target.value)}
            >
              {BANK_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {BANK_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Bank name" required error={errors.bankName}>
          {(field) => (
            <Input
              {...field}
              value={values.bankName}
              onChange={(event) => set('bankName', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="IFSC" required error={errors.ifsc}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.ifsc}
              onChange={(event) => set('ifsc', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Account number"
          required={!account}
          error={errors.accountNumber}
          hint={
            account
              ? `On file: ending ${account.accountLast4}. Leave empty to keep it.`
              : 'Saved encrypted; only the last 4 digits are shown afterwards.'
          }
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={values.accountNumber}
              onChange={(event) => set('accountNumber', event.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={create.isPending || update.isPending}>
          {account ? 'Save' : 'Add bank account'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
