import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import { validateHsnCodeForm } from '@/schemas/hsnCodeForm';
import { bpToPercentText } from '@/utils/format';
import type { HsnCode } from './api';
import { useCreateHsnCode, useUpdateHsnCode } from './hooks';

interface HsnCodeFormProps {
  /** Give the HSN code to edit it. Leave it out to add a new one. */
  hsnCode?: HsnCode | undefined;
  onDone: () => void;
}

export function HsnCodeForm({ hsnCode, onDone }: HsnCodeFormProps) {
  const create = useCreateHsnCode();
  const update = useUpdateHsnCode();
  const [values, setValues] = useState({
    code: hsnCode?.code ?? '',
    description: hsnCode?.description ?? '',
    gstPercent: hsnCode ? bpToPercentText(hsnCode.gstBp) : '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateHsnCodeForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (hsnCode) {
      const { description, gstBp } = result.data; // the code itself never changes
      update.mutate({ id: hsnCode.id, changes: { description, gstBp } }, { onSuccess: onDone });
    } else {
      create.mutate(result.data, { onSuccess: onDone });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">{hsnCode ? 'Edit HSN code' : 'Add an HSN code'}</h2>
      <ErrorAlert message={serverError} />
      {hsnCode && (
        <p className="text-sm text-slate-600">
          Changing the GST rate here does not change products that already use this code: each
          product keeps its own tax rate.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="HSN code" required error={errors.code} hint="4, 6 or 8 digits">
          {(field) => (
            <Input
              {...field}
              name="code"
              required
              inputMode="numeric"
              autoFocus={!hsnCode}
              disabled={hsnCode !== undefined}
              value={values.code}
              onChange={(event) =>
                setValues((current) => ({ ...current, code: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="GST rate (%)" required error={errors.gstPercent} hint="For example: 18">
          {(field) => (
            <Input
              {...field}
              name="gstPercent"
              required
              inputMode="decimal"
              autoFocus={hsnCode !== undefined}
              value={values.gstPercent}
              onChange={(event) =>
                setValues((current) => ({ ...current, gstPercent: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="Description" error={errors.description} hint="Optional">
          {(field) => (
            <Input
              {...field}
              name="description"
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
            />
          )}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {hsnCode ? 'Save' : 'Add HSN code'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
