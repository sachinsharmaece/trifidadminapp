import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import type { InspectionInput } from '@/features/trades/api';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { previewInspection, validateInspection, type InspectionValues } from '@/schemas/dockForms';

/** One PO line as the dock sees it: what was ordered and what the seller says he packed. */
export interface DockLine {
  lineNo: number;
  productName: string;
  packLabel: string;
  boxes: number;
  expiryMonth: string;
  batchNumber: string | null;
  batchDeclared: string | null;
  expiryDeclared: string | null;
  shortExpiryAgreed: boolean;
}

interface InspectionFormProps {
  lines: DockLine[];
  /** From the arrival. */
  boxesCounted: number;
  pending: boolean;
  error: string | undefined;
  onSave: (input: InspectionInput) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * "Check the goods" (LOCK-40 L40.5), per PO line: the batch and expiry found, and the damaged, leaking and extra
 * boxes. Short boxes are never typed: they are ordered − counted. A different batch or expiry, or a short shelf
 * life, is only noted, never a rejection. Once saved, a check cannot be changed.
 */
export function InspectionForm(props: InspectionFormProps) {
  const ordered = props.lines.reduce((sum, line) => sum + line.boxes, 0);
  const extra = Math.max(0, props.boxesCounted - ordered);
  const [values, setValues] = useState<InspectionValues>({
    lines: props.lines.map((line, index) => ({
      lineNo: line.lineNo,
      batchFound: line.batchDeclared ?? line.batchNumber ?? '',
      expiryFound: line.expiryDeclared ?? line.expiryMonth,
      damaged: '0',
      leaking: '0',
      // Extra boxes are offered on the first line; move them if they belong to another.
      excess: index === 0 ? String(extra) : '0',
    })),
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const preview = previewInspection(props.lines, props.boxesCounted, values.lines);

  const setLine = (index: number, field: keyof InspectionValues['lines'][number], value: string) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)),
    }));

  function submit() {
    const result = validateInspection(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    props.onSave(result.data).catch((error: unknown) => setErrors(serverFieldErrors(error)));
  }

  return (
    <ActionFormShell
      title="Check the goods"
      description={`${props.boxesCounted} boxes counted for ${ordered} ordered. Accepted boxes are paid to the seller; short, damaged and leaking boxes are refunded to the buyer. A saved check cannot be changed.`}
      submitLabel="Save the check"
      pending={props.pending}
      error={props.error}
      onSubmit={submit}
      onCancel={props.onCancel}
    >
      {props.lines.map((line, index) => {
        const typed = values.lines[index];
        const result = preview.perLine[index];
        const err = (server: string, client: string) =>
          errors[`lines.${index}.${server}`] ?? errors[`lines.${index}.${client}`];
        return (
          <fieldset key={line.lineNo} className="space-y-3 rounded-md border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold">
              {line.productName} · {line.packLabel} · {line.boxes} boxes
            </legend>
            <p className="text-xs text-slate-500">
              Expected batch {line.batchDeclared ?? line.batchNumber ?? 'not given'}, expiry{' '}
              {line.expiryDeclared ?? line.expiryMonth}
              {line.shortExpiryAgreed ? ' (short expiry agreed with the buyer)' : ''}.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Batch found" error={err('batchFound', 'batchFound')}>
                {(field) => (
                  <Input
                    {...field}
                    autoComplete="off"
                    value={typed.batchFound}
                    onChange={(event) => setLine(index, 'batchFound', event.target.value)}
                  />
                )}
              </FormField>
              <FormField label="Expiry found" error={err('expiryFound', 'expiryFound')}>
                {(field) => (
                  <Input
                    {...field}
                    type="month"
                    value={typed.expiryFound}
                    onChange={(event) => setLine(index, 'expiryFound', event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Damaged boxes" error={err('damagedBoxes', 'damaged')}>
                {(field) => (
                  <Input
                    {...field}
                    inputMode="numeric"
                    value={typed.damaged}
                    onChange={(event) => setLine(index, 'damaged', event.target.value)}
                  />
                )}
              </FormField>
              <FormField label="Leaking boxes" error={err('leakingBoxes', 'leaking')}>
                {(field) => (
                  <Input
                    {...field}
                    inputMode="numeric"
                    value={typed.leaking}
                    onChange={(event) => setLine(index, 'leaking', event.target.value)}
                  />
                )}
              </FormField>
              <FormField label="Extra boxes" error={err('excessBoxes', 'excess')}>
                {(field) => (
                  <Input
                    {...field}
                    inputMode="numeric"
                    value={typed.excess}
                    onChange={(event) => setLine(index, 'excess', event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <p className="text-sm" aria-live="polite">
              Short: <strong>{result.short}</strong> · Accepted:{' '}
              <strong className={result.accepted < 0 ? 'text-red-600' : ''}>
                {Math.max(0, result.accepted)}
              </strong>{' '}
              of {line.boxes}
            </p>
          </fieldset>
        );
      })}
      <FormField label="Note" hint="Anything Purchase should know." error={errors.note}>
        {(field) => (
          <Input
            {...field}
            value={values.note}
            onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}
