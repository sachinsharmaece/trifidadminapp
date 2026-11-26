import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import type { ArrivalInput } from '@/features/trades/api';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateArrival, type ArrivalValues } from '@/schemas/dockForms';

/** Now, as `<input type="datetime-local">` wants it: "2026-11-26T14:30" in the browser's time. */
function nowLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface ArrivalFormProps {
  /** Boxes on the PO, offered as the count. */
  ordered: number;
  pending: boolean;
  error: string | undefined;
  onSave: (input: ArrivalInput) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * "Goods arrived" (Logistics): when, how many boxes were counted, and whether the seller's bill came with them.
 * Used on the Dock screen and, for Founder and Admin, on the deal card.
 */
export function ArrivalForm(props: ArrivalFormProps) {
  const [values, setValues] = useState<ArrivalValues>({
    arrivedAt: nowLocal(),
    boxesCounted: String(props.ordered),
    billWithGoods: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateArrival(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    props.onSave(result.data).catch((error: unknown) => setErrors(serverFieldErrors(error)));
  }

  return (
    <ActionFormShell
      title="Goods arrived"
      description={`Count the boxes as they come off the vehicle (${props.ordered} ordered). The dock then has a day to check them.`}
      submitLabel="Save arrival"
      pending={props.pending}
      error={props.error}
      onSubmit={submit}
      onCancel={props.onCancel}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Arrived at" required error={errors.arrivedAt}>
          {(field) => (
            <Input
              {...field}
              type="datetime-local"
              max={nowLocal()}
              value={values.arrivedAt}
              onChange={(event) =>
                setValues((current) => ({ ...current, arrivedAt: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="Boxes counted" required error={errors.boxesCounted}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              value={values.boxesCounted}
              onChange={(event) =>
                setValues((current) => ({ ...current, boxesCounted: event.target.value }))
              }
            />
          )}
        </FormField>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="billWithGoods"
          checked={values.billWithGoods}
          onChange={(event) =>
            setValues((current) => ({ ...current, billWithGoods: event.target.checked }))
          }
        />
        The seller&apos;s bill came with the goods
      </label>
    </ActionFormShell>
  );
}
