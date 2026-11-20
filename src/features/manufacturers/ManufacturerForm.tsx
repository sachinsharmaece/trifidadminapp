import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import { validateManufacturerForm } from '@/schemas/manufacturerForm';
import type { Manufacturer } from './api';
import { useCreateManufacturer, useUpdateManufacturer } from './hooks';

interface ManufacturerFormProps {
  /** Give the manufacturer to rename it. Leave it out to add a new one. */
  manufacturer?: Manufacturer | undefined;
  onDone: () => void;
}

export function ManufacturerForm({ manufacturer, onDone }: ManufacturerFormProps) {
  const create = useCreateManufacturer();
  const update = useUpdateManufacturer();
  const [name, setName] = useState(manufacturer?.name ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateManufacturerForm({ name });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (manufacturer) {
      update.mutate({ id: manufacturer.id, changes: result.data }, { onSuccess: onDone });
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
        {manufacturer ? 'Rename manufacturer' : 'Add a manufacturer'}
      </h2>
      <ErrorAlert message={serverError} />
      <FormField label="Name" required error={errors.name} className="max-w-md">
        {(field) => (
          <Input
            {...field}
            name="name"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {manufacturer ? 'Save' : 'Add manufacturer'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
