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
        'block min-h-10 w-full rounded border bg-white px-3 py-2 text-sm text-zinc-900',
        'placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100',
        invalid ? 'border-red-500' : 'border-zinc-300 focus:border-zinc-500',
        className,
      )}
      {...rest}
    />
  );
}
