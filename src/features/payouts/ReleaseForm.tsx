import { useState } from 'react';
import { FormField } from '@/components/molecules/FormField';
import { PasswordField } from '@/components/molecules/PasswordField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import type { FormErrors } from '@/schemas/fields';
import { validateRelease } from '@/schemas/payoutForms';
import { formatRupees } from '@/utils/format';
import type { PayoutBatch } from './api';
import { useReleaseBatch } from './hooks';

/**
 * "Release" (Founder or Admin, never the person who built the batch): the person types their password again.
 * Releasing posts nothing and pays nothing: it lets Accounts pay at the bank and type the UTR for each line.
 */
export function ReleaseForm(props: { batch: PayoutBatch; onDone: () => void }) {
  const { batch } = props;
  const release = useReleaseBatch();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateRelease({ password });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    release.mutate({ batch, password: result.data.password }, { onSuccess: props.onDone });
  }

  return (
    <ActionFormShell
      title={`Release ${batch.number}`}
      description={`${batch.lines.length} payment${batch.lines.length === 1 ? '' : 's'}, ${formatRupees(batch.totalPaise)} from ${batch.bankName}. Nothing is paid or posted until each bank proof is typed.`}
      submitLabel="Release batch"
      pending={release.isPending}
      error={release.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
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
