import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateProof } from '@/schemas/payoutForms';
import { formatRupees, todayInIndia } from '@/utils/format';
import type { PayoutBatch, PayoutLine } from './api';
import { useAddProof } from './hooks';

/**
 * "Add bank proof": the UTR the bank gave and the date it was paid. Only now is the line paid. A seller's line
 * also posts the PAYMENT voucher and closes the deal on the seller side; a refund line gives the buyer his money
 * back in the books.
 */
export function ProofForm(props: { batch: PayoutBatch; line: PayoutLine; onDone: () => void }) {
  const { batch, line } = props;
  const save = useAddProof();
  const [values, setValues] = useState({ utr: '', paidOn: todayInIndia() });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateProof(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    save.mutate(
      { batch, line, proof: result.data },
      { onSuccess: props.onDone, onError: (caught) => setErrors(serverFieldErrors(caught)) },
    );
  }

  return (
    <ActionFormShell
      title={`Bank proof for ${line.reference}`}
      description={`${formatRupees(line.amountPaise)} to ${line.payee.firmName}, from ${batch.bankName}. ${
        line.type === 'PAYOUT'
          ? 'Saving it marks the seller paid and closes the deal.'
          : 'Saving it marks the refund paid.'
      }`}
      submitLabel="Save proof"
      pending={save.isPending}
      error={save.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="UTR (bank reference)" required error={errors.utr}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.utr}
              onChange={(event) =>
                setValues((current) => ({ ...current, utr: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="Paid on" required error={errors.paidOn}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.paidOn}
              onChange={(event) =>
                setValues((current) => ({ ...current, paidOn: event.target.value }))
              }
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}
