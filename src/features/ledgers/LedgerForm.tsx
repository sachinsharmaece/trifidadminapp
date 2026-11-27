import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateLedger, validateLedgerName } from '@/schemas/booksForms';
import { HAND_LEDGER_GROUPS } from '@/types/books';
import type { LedgerRow } from './api';
import { useCreateLedger, useUpdateLedger } from './hooks';

/** "Add a ledger": the accounts journals need that the system does not make itself (rent, interest, capital, a loan). */
export function AddLedgerForm({ onDone }: { onDone: () => void }) {
  const create = useCreateLedger();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string>(HAND_LEDGER_GROUPS[0]);
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateLedger({ name, group });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    create.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title="Add a ledger"
      description="For things the books need that are not a buyer, a seller or a bank account, such as rent, interest, capital or a loan."
      submitLabel="Add ledger"
      pending={create.isPending}
      error={create.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Ledger name" required error={errors.name}>
          {(field) => (
            <Input {...field} value={name} onChange={(event) => setName(event.target.value)} />
          )}
        </FormField>
        <FormField label="Group" required error={errors.group}>
          {(field) => (
            <Select {...field} value={group} onChange={(event) => setGroup(event.target.value)}>
              {HAND_LEDGER_GROUPS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** "Rename" a ledger made by hand. */
export function RenameLedgerForm(props: { ledger: LedgerRow; onDone: () => void }) {
  const update = useUpdateLedger();
  const [name, setName] = useState(props.ledger.name);
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateLedgerName({ name });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    update.mutate(
      { ledger: props.ledger, name: result.data.name },
      { onSuccess: props.onDone, onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <ActionFormShell
      title={`Rename ${props.ledger.name}`}
      description="Old vouchers show the new name too."
      submitLabel="Save name"
      pending={update.isPending}
      error={update.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
      <FormField label="Ledger name" required error={errors.name}>
        {(field) => (
          <Input {...field} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </FormField>
    </ActionFormShell>
  );
}
