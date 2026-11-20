import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { FormErrors } from '@/schemas/fields';
import { emptyPack, validatePackForm, type PackFormValues } from '@/schemas/productForm';
import type { Sku } from './api';
import { useAddSku, useUpdateSku } from './hooks';
import { PackFields } from './PackFields';

interface PackFormProps {
  productId: string;
  /** Give the pack to edit it. Leave it out to add a new pack. */
  sku?: Sku | undefined;
  onDone: () => void;
}

export function PackForm({ productId, sku, onDone }: PackFormProps) {
  const add = useAddSku();
  const update = useUpdateSku();
  const [values, setValues] = useState<PackFormValues>(
    sku
      ? { packLabel: sku.packLabel, unitsPerBox: String(sku.unitsPerBox), skuClass: sku.skuClass }
      : emptyPack(),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = add.isPending || update.isPending;
  const serverError = add.error?.message ?? update.error?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validatePackForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (sku) {
      update.mutate({ id: sku.id, changes: result.data }, { onSuccess: onDone });
    } else {
      add.mutate({ productId, pack: result.data }, { onSuccess: onDone });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">
        {sku ? `Edit pack ${sku.packLabel}` : 'Add a pack'}
      </h2>
      <ErrorAlert message={serverError} />
      <PackFields values={values} onChange={setValues} errors={errors} autoFocus />
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {sku ? 'Save' : 'Add pack'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
