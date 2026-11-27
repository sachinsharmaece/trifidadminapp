import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateJournal, type JournalLineValues, type JournalValues } from '@/schemas/booksForms';
import { JOURNAL_KIND_LABELS, JOURNAL_KINDS, type JournalKind } from '@/types/books';
import { formatRupees, todayInIndia } from '@/utils/format';
import { LedgerPicker } from './LedgerPicker';
import { useCreateJournal } from './hooks';

const emptyLine = (): JournalLineValues => ({ choice: null, text: '', dr: '', cr: '' });

/** The paise in a typed amount, or 0 while it is empty or not a number yet (for the live totals only). */
function paiseOf(text: string): number {
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : 0;
}

/**
 * "New entry": a journal (two or more lines, debits equal to credits) or the opening balances the books start from.
 * It is not in the books yet: a different person approves it first.
 */
export function JournalForm({ onDone }: { onDone: () => void }) {
  const create = useCreateJournal();
  const [values, setValues] = useState<JournalValues>({
    kind: 'JOURNAL',
    date: todayInIndia(),
    narration: '',
    lines: [emptyLine(), emptyLine()],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const dr = values.lines.reduce((sum, line) => sum + paiseOf(line.dr), 0);
  const cr = values.lines.reduce((sum, line) => sum + paiseOf(line.cr), 0);

  const setLine = (index: number, change: Partial<JournalLineValues>) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, at) => (at === index ? { ...line, ...change } : line)),
    }));

  function submit() {
    const result = validateJournal(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    create.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title="New entry"
      description="Type the lines of a journal, or the opening balances. Nothing is in the books until someone else approves it."
      submitLabel="Send for approval"
      pending={create.isPending}
      error={create.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Kind" required>
          {(field) => (
            <Select
              {...field}
              value={values.kind}
              onChange={(event) =>
                setValues((current) => ({ ...current, kind: event.target.value as JournalKind }))
              }
            >
              {JOURNAL_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {JOURNAL_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Date"
          required
          error={errors.date}
          hint={
            values.kind === 'OPENING' ? 'On or before the first entry in the books.' : undefined
          }
        >
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.date}
              onChange={(event) =>
                setValues((current) => ({ ...current, date: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="What is it for?" required error={errors.narration}>
          {(field) => (
            <Input
              {...field}
              value={values.narration}
              onChange={(event) =>
                setValues((current) => ({ ...current, narration: event.target.value }))
              }
            />
          )}
        </FormField>
      </div>

      <div className="space-y-2">
        <div className="hidden gap-2 text-xs font-medium uppercase text-slate-500 sm:grid sm:grid-cols-[1fr_9rem_9rem_2rem]">
          <span>Ledger</span>
          <span>Debit (₹)</span>
          <span>Credit (₹)</span>
          <span />
        </div>
        {values.lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[1fr_9rem_9rem_2rem] sm:border-0 sm:p-0"
          >
            <div>
              <LedgerPicker
                label={`Ledger of line ${index + 1}`}
                text={line.text}
                invalid={Boolean(errors[`lines.${index}.ledgerId`])}
                onTextChange={(text) => setLine(index, { text, choice: null })}
                onPick={(choice) =>
                  setLine(index, {
                    text: choice.name,
                    choice:
                      choice.kind === 'LEDGER'
                        ? { kind: 'LEDGER', ledgerId: choice.ledgerId }
                        : { kind: 'PARTY', side: choice.side, id: choice.id },
                  })
                }
              />
              {errors[`lines.${index}.ledgerId`] && (
                <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                  {errors[`lines.${index}.ledgerId`]}
                </p>
              )}
            </div>
            <Input
              aria-label={`Debit of line ${index + 1}`}
              placeholder="Debit ₹"
              inputMode="decimal"
              value={line.dr}
              invalid={Boolean(errors[`lines.${index}.drPaise`])}
              onChange={(event) => setLine(index, { dr: event.target.value })}
            />
            <Input
              aria-label={`Credit of line ${index + 1}`}
              placeholder="Credit ₹"
              inputMode="decimal"
              value={line.cr}
              invalid={Boolean(errors[`lines.${index}.crPaise`])}
              onChange={(event) => setLine(index, { cr: event.target.value })}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove line ${index + 1}`}
              disabled={values.lines.length <= 2}
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  lines: current.lines.filter((_, at) => at !== index),
                }))
              }
            >
              ×
            </Button>
            {(errors[`lines.${index}.drPaise`] ?? errors[`lines.${index}.crPaise`]) && (
              <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-4">
                {errors[`lines.${index}.drPaise`] ?? errors[`lines.${index}.crPaise`]}
              </p>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setValues((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))
            }
          >
            Add a line
          </Button>
          <p className="text-sm" aria-live="polite">
            Debits <strong>{formatRupees(dr)}</strong> · Credits <strong>{formatRupees(cr)}</strong>
            {dr !== cr && (
              <span className="ml-2 text-red-600">differ by {formatRupees(Math.abs(dr - cr))}</span>
            )}
          </p>
        </div>
        {errors.lines && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errors.lines}
          </p>
        )}
      </div>
    </ActionFormShell>
  );
}
