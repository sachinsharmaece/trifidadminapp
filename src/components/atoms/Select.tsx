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
        'block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        invalid ? 'border-red-500' : 'border-slate-300 hover:border-slate-400',
        className,
      )}
      {...rest}
    />
  );
}
