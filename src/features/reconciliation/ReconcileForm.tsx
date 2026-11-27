import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateReconcile } from '@/schemas/booksForms';
import { todayInIndia } from '@/utils/format';
import type { ReconcileBank } from './api';
import { useSaveReconciliation } from './hooks';

/**
 * "Check against the statement": Accounts picks a bank account and a day, and types the closing balance printed on
 * the bank's statement. The next screen shows the difference from the books.
 */
export function ReconcileForm(props: {
  banks: ReconcileBank[];
  initialBankId?: string;
  onDone: () => void;
}) {
  const save = useSaveReconciliation();
  const [bankLedgerId, setBankLedgerId] = useState(
    props.initialBankId ?? props.banks[0]?.bankLedgerId ?? '',
  );
  const [date, setDate] = useState(todayInIndia());
  const [statement, setStatement] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateReconcile({ bankLedgerId, date, statement });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    save.mutate(
      { bankLedgerId, date: result.data.date, statementClosingPaise: result.data.statement },
      { onSuccess: props.onDone, onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <ActionFormShell
      title="Check against the bank statement"
      description="Type the closing balance printed on the statement for that day. A minus sign means the account is overdrawn."
      submitLabel="Check"
      pending={save.isPending}
      error={save.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Bank account" required error={errors.bankLedgerId}>
          {(field) => (
            <Select
              {...field}
              value={bankLedgerId}
              onChange={(event) => setBankLedgerId(event.target.value)}
            >
              {props.banks.map((bank) => (
                <option key={bank.bankLedgerId} value={bank.bankLedgerId}>
                  {bank.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Statement date" required error={errors.date}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Closing balance on the statement (₹)" required error={errors.statement}>
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}
