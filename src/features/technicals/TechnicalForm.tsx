import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import { validateTechnicalForm } from '@/schemas/technicalForm';
import type { Technical } from './api';
import { useCreateTechnical, useUpdateTechnical } from './hooks';

interface TechnicalFormProps {
  /** Give the technical to edit it. Leave it out to add a new one. */
  technical?: Technical | undefined;
  onDone: () => void;
}

export function TechnicalForm({ technical, onDone }: TechnicalFormProps) {
  const create = useCreateTechnical();
  const update = useUpdateTechnical();
  const [values, setValues] = useState({
    name: technical?.name ?? '',
    description: technical?.description ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTechnicalForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (technical) {
      update.mutate({ id: technical.id, changes: result.data }, { onSuccess: onDone });
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
        {technical ? 'Edit technical' : 'Add a technical'}
      </h2>
      <ErrorAlert message={serverError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          required
          error={errors.name}
          hint="For example: Imidacloprid 17.8% SL"
        >
          {(field) => (
            <Input
              {...field}
              name="name"
              required
              autoFocus
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
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
          {technical ? 'Save' : 'Add technical'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
