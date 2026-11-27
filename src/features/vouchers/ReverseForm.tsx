import { useState } from 'react';
import { FormField } from '@/components/molecules/FormField';
import { PasswordField } from '@/components/molecules/PasswordField';
import { Input } from '@/components/atoms/Input';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateReverse } from '@/schemas/booksForms';
import type { VoucherRow } from './api';
import { useReverseVoucher } from './hooks';

/**
 * "Reverse" (Controller, Founder or Admin): posts the exact mirror of the voucher, dated today. The original stays
 * in the books, so the history is complete. The person types their password again.
 */
export function ReverseForm(props: { voucher: VoucherRow; onDone: () => void }) {
  const { voucher } = props;
  const reverse = useReverseVoucher();
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateReverse({ reason, password });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    reverse.mutate(
      { id: voucher.id, reason: result.data.reason, password: result.data.password },
      { onSuccess: props.onDone, onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <ActionFormShell
      title={`Reverse ${voucher.number}`}
      description="This posts the exact opposite entry, dated today. The original voucher stays in the books. A reversal cannot be reversed."
      submitLabel="Reverse voucher"
      pending={reverse.isPending}
      error={reverse.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
      <FormField label="Why is it reversed?" required error={errors.reason}>
        {(field) => (
          <Input {...field} value={reason} onChange={(event) => setReason(event.target.value)} />
        )}
      </FormField>
      <FormField label="Your password" required error={errors.password}>
        {(field) => (
          <PasswordField
            {...field}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}
