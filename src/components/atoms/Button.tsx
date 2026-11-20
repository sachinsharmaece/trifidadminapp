import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:hover:bg-brand-600',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:hover:bg-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string | undefined;
}

/** The button look as a class string, so a <Link> can look like a button too: <Link className={buttonStyles()}>. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks while something is happening. */
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button', // "button" by default so a button inside a <form> does not submit it by accident
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading && <Spinner label="Working" className="h-4 w-4" />}
      {children}
    </button>
  );
}
