import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import { validateTehsilForm, type TehsilFormValues } from '@/schemas/tehsilForm';
import type { Tehsil } from './api';
import { useCreateTehsil, useUpdateTehsil } from './hooks';

interface TehsilFormProps {
  /** Give the tehsil to edit it. Leave it out to add a new one. */
  tehsil?: Tehsil | undefined;
  onDone: () => void;
}

export function TehsilForm({ tehsil, onDone }: TehsilFormProps) {
  const create = useCreateTehsil();
  const update = useUpdateTehsil();
  const [values, setValues] = useState<TehsilFormValues>({
    state: tehsil?.state ?? '',
    district: tehsil?.district ?? '',
    name: tehsil?.name ?? '',
    pincodes: tehsil?.pincodes.join(', ') ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function setField(field: keyof TehsilFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTehsilForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (tehsil) {
      update.mutate({ id: tehsil.id, changes: result.data }, { onSuccess: onDone });
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
      <h2 className="text-base font-semibold">{tehsil ? 'Edit tehsil' : 'Add a tehsil'}</h2>
      <ErrorAlert message={serverError} />
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="State" required error={errors.state}>
          {(field) => (
            <Input
              {...field}
              name="state"
              required
              autoFocus
              value={values.state}
              onChange={(event) => setField('state', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="District" required error={errors.district}>
          {(field) => (
            <Input
              {...field}
              name="district"
              required
              value={values.district}
              onChange={(event) => setField('district', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Tehsil" required error={errors.name}>
          {(field) => (
            <Input
              {...field}
              name="name"
              required
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Pincodes"
          error={errors.pincodes}
          hint="Optional. Separate with commas or spaces, like 452001, 452002"
          className="sm:col-span-3"
        >
          {(field) => (
            <Input
              {...field}
              name="pincodes"
              inputMode="numeric"
              value={values.pincodes}
              onChange={(event) => setField('pincodes', event.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {tehsil ? 'Save' : 'Add tehsil'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
