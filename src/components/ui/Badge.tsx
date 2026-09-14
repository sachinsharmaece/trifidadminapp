import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  good: 'bg-success-50 text-success-600',
  warn: 'bg-warning-50 text-warning-600',
  bad: 'bg-danger-50 text-danger-600',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
