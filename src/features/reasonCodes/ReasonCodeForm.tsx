import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import { validateReasonCodeForm, type ReasonCodeFormValues } from '@/schemas/reasonCodeForm';
import { CONTEXT_LABELS, REASON_CODE_CONTEXTS } from '@/types/reasonCode';
import type { ReasonCode } from './api';
import { useCreateReasonCode, useUpdateReasonCode } from './hooks';

interface ReasonCodeFormProps {
  /** Give the reason code to edit it. Leave it out to add a new one. */
  reasonCode?: ReasonCode | undefined;
  onDone: () => void;
}

export function ReasonCodeForm({ reasonCode, onDone }: ReasonCodeFormProps) {
  const create = useCreateReasonCode();
  const update = useUpdateReasonCode();
  const [values, setValues] = useState<ReasonCodeFormValues>({
    code: reasonCode?.code ?? '',
    label: reasonCode?.label ?? '',
    context: reasonCode?.context ?? '', // no default: the person must choose
    sort: String(reasonCode?.sort ?? 100),
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function setField(field: keyof ReasonCodeFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateReasonCodeForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (reasonCode) {
      const { label, sort } = result.data; // the code and its context never change
      update.mutate({ id: reasonCode.id, changes: { label, sort } }, { onSuccess: onDone });
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
      <h2 className="text-base font-semibold">
        {reasonCode ? 'Edit reason code' : 'Add a reason code'}
      </h2>
      <ErrorAlert message={serverError} />
      {reasonCode && (
        <p className="text-sm text-slate-600">
          The code and where it is used cannot be changed, because records may already use it. To
          change them, turn this reason off and add a new one.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Used for"
          required
          error={errors.context}
          hint="The reason appears only in the dropdown of this context"
        >
          {(field) => (
            <Select
              {...field}
              name="context"
              disabled={reasonCode !== undefined}
              autoFocus={!reasonCode}
              value={values.context}
              onChange={(event) => setField('context', event.target.value)}
            >
              <option value="">Choose…</option>
              {REASON_CODE_CONTEXTS.map((context) => (
                <option key={context} value={context}>
                  {CONTEXT_LABELS[context]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Code"
          required
          error={errors.code}
          hint="Capital letters, digits and _ , like WRONG_PRICE"
        >
          {(field) => (
            <Input
              {...field}
              name="code"
              required
              disabled={reasonCode !== undefined}
              value={values.code}
              onChange={(event) => setField('code', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Label"
          required
          error={errors.label}
          hint="What staff see in the dropdown"
        >
          {(field) => (
            <Input
              {...field}
              name="label"
              required
              autoFocus={reasonCode !== undefined}
              value={values.label}
              onChange={(event) => setField('label', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Order"
          required
          error={errors.sort}
          hint="Smaller numbers come first in the dropdown"
        >
          {(field) => (
            <Input
              {...field}
              name="sort"
              required
              inputMode="numeric"
              value={values.sort}
              onChange={(event) => setField('sort', event.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {reasonCode ? 'Save' : 'Add reason code'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
