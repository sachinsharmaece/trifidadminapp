import type { ReactNode } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface PageLayoutProps {
  title: string;
  description?: string;
  /** Buttons shown next to the title, e.g. "Add user". */
  actions?: ReactNode;
  children: ReactNode;
}

/** The standard page body inside the dashboard: a heading row, then the content. */
export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  useDocumentTitle(title);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
