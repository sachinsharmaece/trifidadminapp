import { useId, type ReactNode } from 'react';
import { Label } from '@/components/atoms/Label';
import { cn } from '@/lib/cn';

/** Props to spread onto the input so it is wired to its label, hint and error message. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  invalid: boolean;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  /** Helper text under the input. */
  hint?: string;
  /** Error text under the input. Setting it also marks the input as invalid. */
  error?: string | undefined;
  className?: string;
  /** Receives the props the input needs: <FormField label="Email">{(field) => <Input {...field} />}</FormField> */
  children: (field: FieldControlProps) => ReactNode;
}

export function FormField({ label, required, hint, error, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} required={required ?? false}>
        {label}
      </Label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
