import { NumberInput } from './NumberInput';

/** − [n] + box for a small whole number, copied from the reference (components/forms/QuantityStepper.tsx). */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
}) {
  function bump(delta: number) {
    const base = value ?? min - step;
    let next = Math.max(min, base + delta);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded border border-zinc-300">
      <button
        type="button"
        onClick={() => bump(-step)}
        aria-label="Decrease quantity"
        className="flex min-h-11 w-11 items-center justify-center bg-zinc-50 text-base text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200"
      >
        −
      </button>
      <NumberInput
        ariaLabel={ariaLabel}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        inputMode="numeric"
        className="min-h-11 w-14 border-0 text-center text-base focus:outline-none sm:text-sm"
      />
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label="Increase quantity"
        className="flex min-h-11 w-11 items-center justify-center bg-zinc-50 text-base text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200"
      >
        +
      </button>
    </div>
  );
}
