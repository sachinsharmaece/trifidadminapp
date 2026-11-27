/**
 * A number box that starts empty (never pre-filled), copied from the reference (components/forms/NumberInput.tsx).
 * Gives `undefined` while empty, so "not entered yet" differs from 0.
 */
export function NumberInput({
  name,
  value,
  onChange,
  min,
  step,
  required,
  placeholder,
  className,
  ariaLabel,
  inputMode = 'decimal',
}: {
  name?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  step?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  inputMode?: 'decimal' | 'numeric';
}) {
  return (
    <input
      name={name}
      type="number"
      aria-label={ariaLabel}
      inputMode={inputMode}
      value={value === undefined ? '' : value}
      min={min}
      step={step}
      required={required}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? undefined : Number(raw));
      }}
      className={
        className ??
        'rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none'
      }
    />
  );
}
