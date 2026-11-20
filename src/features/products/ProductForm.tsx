import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import {
  emptyPack,
  validateNewProductForm,
  validateProductDetailsForm,
  type NewProductFormValues,
} from '@/schemas/productForm';
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from '@/types/product';
import { bpToPercentText } from '@/utils/format';
import type { Product } from './api';
import { useCreateProduct, useProductLookups, useUpdateProduct } from './hooks';
import { PackFields } from './PackFields';

interface ProductFormProps {
  /** Give the product to edit its details. Leave it out to add a new product (with its first packs). */
  product?: Product | undefined;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

/** A choice in a drop-down: only active records, plus the one already chosen (even if turned off since). */
function choices<T extends { id: string; active: boolean }>(items: readonly T[], chosenId: string) {
  return items.filter((item) => item.active || item.id === chosenId);
}

export function ProductForm({ product, onSaved, onCancel }: ProductFormProps) {
  const lookups = useProductLookups();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [values, setValues] = useState<NewProductFormValues>({
    name: product?.name ?? '',
    category: product?.category ?? 'PESTICIDE',
    manufacturerId: product?.manufacturerId ?? '',
    technicalId: product?.technicalId ?? '',
    hsnCodeId: product?.hsnCodeId ?? '',
    taxPercent: product ? bpToPercentText(product.taxBp) : '',
    skus: [emptyPack()],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const saving = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  function setField(field: keyof NewProductFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Picking an HSN code fills in its GST rate. The person can still change it for this product. */
  function chooseHsnCode(hsnCodeId: string) {
    const hsnCode = lookups.hsnCodes.find((item) => item.id === hsnCodeId);
    setValues((current) => ({
      ...current,
      hsnCodeId,
      taxPercent: hsnCode ? bpToPercentText(hsnCode.gstBp) : current.taxPercent,
    }));
  }

  function setPack(index: number, pack: NewProductFormValues['skus'][number]) {
    setValues((current) => ({
      ...current,
      skus: current.skus.map((existing, position) => (position === index ? pack : existing)),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (product) {
      const result = validateProductDetailsForm(values);
      if (!result.ok) return setErrors(result.errors);
      setErrors({});
      update.mutate(
        { id: product.id, changes: result.data },
        { onSuccess: (saved) => onSaved(saved) },
      );
    } else {
      const result = validateNewProductForm(values);
      if (!result.ok) return setErrors(result.errors);
      setErrors({});
      create.mutate(result.data, { onSuccess: (saved) => onSaved(saved) });
    }
  }

  if (lookups.isPending) {
    return <Spinner label="Loading" className="h-6 w-6 text-brand-600" />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">{product ? 'Edit product' : 'Product'}</h2>
        <ErrorAlert message={serverError ?? lookups.errorMessage} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" required error={errors.name} className="sm:col-span-2">
            {(field) => (
              <Input
                {...field}
                name="name"
                required
                autoFocus
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Category" required error={errors.category}>
            {(field) => (
              <Select
                {...field}
                name="category"
                value={values.category}
                onChange={(event) => setField('category', event.target.value)}
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Manufacturer" required error={errors.manufacturerId}>
            {(field) => (
              <Select
                {...field}
                name="manufacturerId"
                value={values.manufacturerId}
                onChange={(event) => setField('manufacturerId', event.target.value)}
              >
                <option value="">Choose…</option>
                {choices(lookups.manufacturers, values.manufacturerId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.active ? '' : ' (turned off)'}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Technical" required error={errors.technicalId}>
            {(field) => (
              <Select
                {...field}
                name="technicalId"
                value={values.technicalId}
                onChange={(event) => setField('technicalId', event.target.value)}
              >
                <option value="">Choose…</option>
                {choices(lookups.technicals, values.technicalId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.active ? '' : ' (turned off)'}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="HSN code" required error={errors.hsnCodeId}>
            {(field) => (
              <Select
                {...field}
                name="hsnCodeId"
                value={values.hsnCodeId}
                onChange={(event) => chooseHsnCode(event.target.value)}
              >
                <option value="">Choose…</option>
                {choices(lookups.hsnCodes, values.hsnCodeId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} {item.description && `· ${item.description}`}
                    {item.active ? '' : ' (turned off)'}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField
            label="GST rate (%)"
            required
            error={errors.taxPercent}
            hint="Filled in from the HSN code. Change it only if this product differs."
          >
            {(field) => (
              <Input
                {...field}
                name="taxPercent"
                required
                inputMode="decimal"
                value={values.taxPercent}
                onChange={(event) => setField('taxPercent', event.target.value)}
              />
            )}
          </FormField>
        </div>
      </section>

      {!product && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-base font-semibold">Packs</h2>
            <p className="text-sm text-slate-600">
              Every product is sold in at least one pack. You can add more later.
            </p>
          </div>
          {errors.skus && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {errors.skus}
            </p>
          )}
          {values.skus.map((pack, index) => (
            <div key={index} className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700">Pack {index + 1}</h3>
                {values.skus.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        skus: current.skus.filter((_, position) => position !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
              <PackFields
                values={pack}
                onChange={(next) => setPack(index, next)}
                errors={errors}
                errorPrefix={`skus.${index}.`}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              setValues((current) => ({ ...current, skus: [...current.skus, emptyPack()] }))
            }
          >
            Add another pack
          </Button>
        </section>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {product ? 'Save changes' : 'Create product'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
