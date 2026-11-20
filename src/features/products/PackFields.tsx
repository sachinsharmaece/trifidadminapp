import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import type { FormErrors } from '@/schemas/fields';
import type { PackFormValues } from '@/schemas/productForm';
import { SKU_CLASSES } from '@/types/product';

interface PackFieldsProps {
  values: PackFormValues;
  onChange: (values: PackFormValues) => void;
  errors: FormErrors;
  /** Where this pack's errors start in `errors`, e.g. "skus.0." for the first of several rows. */
  errorPrefix?: string;
  autoFocus?: boolean;
}

/** The three inputs that describe one pack. Used for a single pack and for each row of a new product. */
export function PackFields({
  values,
  onChange,
  errors,
  errorPrefix = '',
  autoFocus = false,
}: PackFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormField
        label="Pack label"
        required
        error={errors[`${errorPrefix}packLabel`]}
        hint="For example: 500 ML"
      >
        {(field) => (
          <Input
            {...field}
            name="packLabel"
            required
            autoFocus={autoFocus}
            value={values.packLabel}
            onChange={(event) => onChange({ ...values, packLabel: event.target.value })}
          />
        )}
      </FormField>
      <FormField
        label="Units per box"
        required
        error={errors[`${errorPrefix}unitsPerBox`]}
        hint="How many bottles or packets in one box"
      >
        {(field) => (
          <Input
            {...field}
            name="unitsPerBox"
            required
            inputMode="numeric"
            value={values.unitsPerBox}
            onChange={(event) => onChange({ ...values, unitsPerBox: event.target.value })}
          />
        )}
      </FormField>
      <FormField
        label="Class"
        required
        error={errors[`${errorPrefix}skuClass`]}
        hint="With the buyer's tier, it decides the margin"
      >
        {(field) => (
          <Select
            {...field}
            name="skuClass"
            value={values.skuClass}
            onChange={(event) => onChange({ ...values, skuClass: event.target.value })}
          >
            {SKU_CLASSES.map((skuClass) => (
              <option key={skuClass} value={skuClass}>
                Class {skuClass}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </div>
  );
}
