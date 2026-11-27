import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends ComponentProps<'select'> {
  /** Draws the red error border. */
  invalid?: boolean;
}

/** A drop-down list. Same look as Input. Put <option> elements inside. */
export function Select({ invalid = false, className, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'block min-h-10 w-full rounded border bg-white px-3 py-2 text-sm text-zinc-900',
        'disabled:cursor-not-allowed disabled:bg-zinc-100',
        invalid ? 'border-red-500' : 'border-zinc-300 focus:border-zinc-500',
        className,
      )}
      {...rest}
    />
  );
}
