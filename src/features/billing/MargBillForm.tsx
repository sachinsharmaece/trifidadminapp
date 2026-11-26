import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import type { MargBillInput } from '@/features/trades/api';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateMargBill, type MargBillValues } from '@/schemas/billingForms';
import { formatRupees, paiseToRupeesText, todayInIndia } from '@/utils/format';
import type { Accepted } from './api';

interface MargBillFormProps {
  accepted: Accepted;
  pending: boolean;
  error: string | undefined;
  onSave: (input: MargBillInput) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * "Marg bill" (Accounts): the invoice Marg printed for the buyer. It may not bill more boxes than the dock
 * accepted, nor be higher than the accepted boxes at the buyer's rate. A lower bill is allowed (Q-ACC-02) and the
 * difference is shown. Used on To be billed and, for Founder and Admin, on the deal card.
 */
export function MargBillForm({ accepted, pending, error, onSave, onCancel }: MargBillFormProps) {
  const [values, setValues] = useState<MargBillValues>({
    invoiceNumber: '',
    ewayBillNumber: '',
    billDate: todayInIndia(),
    total: paiseToRupeesText(accepted.expectedPaise),
    lines: accepted.lines.map((line) => ({
      lineNo: line.lineNo,
      boxes: String(line.acceptedBoxes),
    })),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: 'invoiceNumber' | 'ewayBillNumber' | 'billDate' | 'total', value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const totalPaise = /^\d{1,9}(\.\d{1,2})?$/.test(values.total.trim())
    ? Math.round(Number(values.total) * 100)
    : null;

  function submit() {
    const result = validateMargBill(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    onSave(result.data).catch((caught: unknown) => setErrors(serverFieldErrors(caught)));
  }

  return (
    <ActionFormShell
      title="Marg bill"
      description={`Key the invoice from Marg. At most ${formatRupees(accepted.expectedPaise)}: the ${accepted.acceptedBoxes} accepted boxes at the buyer's rate. A lower bill is allowed.`}
      submitLabel="Save Marg bill"
      pending={pending}
      error={error}
      onSubmit={submit}
      onCancel={onCancel}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Marg invoice number" required error={errors.invoiceNumber}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.invoiceNumber}
              onChange={(event) => set('invoiceNumber', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="E-way bill number" error={errors.ewayBillNumber}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.ewayBillNumber}
              onChange={(event) => set('ewayBillNumber', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Bill date" required error={errors.billDate}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.billDate}
              onChange={(event) => set('billDate', event.target.value)}
            />
          )}
        </FormField>
      </div>
      {accepted.lines.map((line, index) => (
        <FormField
          key={line.lineNo}
          label={`Boxes billed: ${line.productName} · ${line.packLabel}`}
          required
          hint={`${line.acceptedBoxes} accepted at the dock (of ${line.orderedBoxes} ordered) · ${formatRupees(line.buyerRatePaisePerUnit)} per unit`}
          error={errors[`lines.${index}.boxes`]}
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              value={values.lines[index]?.boxes ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  lines: current.lines.map((item, at) =>
                    at === index ? { ...item, boxes: event.target.value } : item,
                  ),
                }))
              }
            />
          )}
        </FormField>
      ))}
      <FormField
        label="Bill total (₹, tax included)"
        required
        error={errors.totalPaise ?? errors.total}
      >
        {(field) => (
          <Input
            {...field}
            inputMode="decimal"
            value={values.total}
            onChange={(event) => set('total', event.target.value)}
          />
        )}
      </FormField>
      {totalPaise !== null && totalPaise < accepted.expectedPaise && (
        <p className="text-sm text-amber-700" aria-live="polite">
          {formatRupees(accepted.expectedPaise - totalPaise)} lower than the accepted boxes at the
          buyer&apos;s rate (allowed).
        </p>
      )}
      {totalPaise !== null && totalPaise > accepted.expectedPaise && (
        <p className="text-sm text-red-700" aria-live="polite">
          {formatRupees(totalPaise - accepted.expectedPaise)} higher than allowed: this will be
          refused.
        </p>
      )}
    </ActionFormShell>
  );
}
