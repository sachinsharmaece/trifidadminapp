import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  good: 'bg-success-50 text-success-600',
  warn: 'bg-warning-50 text-warning-600',
  bad: 'bg-danger-50 text-danger-600',
};

// Mockup-style outline pill — same tone color, no fill.
const CHIP_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-slate-300 bg-transparent text-slate-700',
  good: 'border-success-500/40 bg-transparent text-success-600',
  warn: 'border-warning-500/40 bg-transparent text-warning-600',
  bad: 'border-danger-500/40 bg-transparent text-danger-600',
};

export function Badge({
  tone = 'neutral',
  variant = 'filled',
  children,
}: {
  tone?: BadgeTone;
  /** `'chip'` is a border-only outline pill instead of the default filled background. */
  variant?: 'filled' | 'chip';
  children: ReactNode;
}) {
  const toneClasses = variant === 'chip' ? CHIP_TONE_CLASSES[tone] : TONE_CLASSES[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        variant === 'chip' ? 'border' : ''
      } ${toneClasses}`}
    >
      {children}
    </span>
  );
}
