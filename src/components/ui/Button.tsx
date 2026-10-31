import { useId } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { FiLoader } from 'react-icons/fi';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 focus-visible:outline-brand-600 disabled:bg-brand-500/50',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-brand-600 disabled:text-slate-400',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 focus-visible:outline-danger-600 disabled:bg-danger-500/50',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-brand-600 disabled:text-slate-300',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * The one button in the app — every action goes through this. A disabled button's `title`
 * (why it cannot be pressed yet) also shows as a tip on hover, keyboard focus and tap, since
 * the browser's own tooltip never appears on a phone or for a button that cannot take focus.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  type = 'button',
  title,
  ...rest
}: ButtonProps) {
  const tipId = useId();
  const isDisabled = disabled || loading;
  const showTip = !!title && !!disabled && !loading;
  const button = (
    <button
      type={type}
      disabled={isDisabled}
      title={showTip ? undefined : title}
      aria-describedby={showTip ? tipId : undefined}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <FiLoader className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
  if (!showTip) return button;
  return (
    <span
      tabIndex={0}
      className={`group/tip relative inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
        /\bw-full\b/.test(className) ? 'w-full' : ''
      }`}
    >
      {button}
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug font-normal text-white shadow-lg group-hover/tip:block group-focus/tip:block"
      >
        {title}
      </span>
    </span>
  );
}
