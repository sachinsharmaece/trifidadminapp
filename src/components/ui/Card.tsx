import type { ReactNode } from 'react';

export function Card({
  title,
  actions,
  children,
  className = '',
  onClick,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
      onClick={onClick}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && <h2 className="min-w-0 text-base font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
