import { NumberInput } from './NumberInput';

/** A ₹ amount box, copied from the reference (components/forms/CurrencyInput.tsx). Takes and gives rupees. */
export function CurrencyInput({
  value,
  onChange,
  required,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (rupees: number | undefined) => void;
  required?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded border border-zinc-300 focus-within:border-zinc-500">
      <span className="flex items-center bg-zinc-50 px-2 text-sm text-zinc-500">₹</span>
      <NumberInput
        ariaLabel={ariaLabel}
        value={value}
        onChange={onChange}
        min={0}
        step={0.01}
        required={required}
        className="w-full border-0 px-2 py-2 text-sm focus:outline-none"
      />
    </div>
  );
}
