import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const FIELD_CLASSES =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30 disabled:bg-slate-100 disabled:text-slate-400';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-danger-500"> *</span>}
    </label>
  );
}

function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return (
      <p role="alert" className="mt-1 text-sm text-danger-500">
        {error}
      </p>
    );
  }
  if (hint) return <p className="mt-1 text-sm text-slate-500">{hint}</p>;
  return null;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

/** A labeled text input with its error/hint baked in — never placeholder-only labeling. */
export function Input({ label, error, hint, required, id, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <FieldLabel htmlFor={fieldId} label={label} required={required} />
      <input
        id={fieldId}
        required={required}
        aria-invalid={!!error}
        className={`${FIELD_CLASSES} ${className}`}
        {...rest}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {}

export function Textarea({
  label,
  error,
  hint,
  required,
  id,
  className = '',
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <FieldLabel htmlFor={fieldId} label={label} required={required} />
      <textarea
        id={fieldId}
        required={required}
        aria-invalid={!!error}
        className={`${FIELD_CLASSES} min-h-24 ${className}`}
        {...rest}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldWrapperProps {}

export function Select({
  label,
  error,
  hint,
  required,
  id,
  className = '',
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <FieldLabel htmlFor={fieldId} label={label} required={required} />
      <select
        id={fieldId}
        required={required}
        aria-invalid={!!error}
        className={`${FIELD_CLASSES} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}
