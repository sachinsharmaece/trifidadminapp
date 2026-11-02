import type { ReactNode } from 'react';

/**
 * The top of a screen: its title, an optional line under it, and its main actions on the
 * right (dropping under the title on a phone). One size and spacing for every desk.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
