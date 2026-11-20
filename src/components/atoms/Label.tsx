import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface LabelProps extends ComponentProps<'label'> {
  /** Adds a red asterisk. The input itself should also have the `required` attribute. */
  required?: boolean;
}

export function Label({ required = false, className, children, ...rest }: LabelProps) {
  return (
    <label className={cn('block text-sm font-medium text-slate-700', className)} {...rest}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-red-600">
          *
        </span>
      )}
    </label>
  );
}
