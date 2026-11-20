import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends ComponentProps<'input'> {
  /** Draws the red error border. FormField also sets aria-invalid for screen readers. */
  invalid?: boolean;
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100',
        invalid ? 'border-red-500' : 'border-slate-300 hover:border-slate-400',
        className,
      )}
      {...rest}
    />
  );
}
