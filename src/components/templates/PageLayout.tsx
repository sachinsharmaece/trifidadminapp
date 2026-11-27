import type { ReactNode } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface PageLayoutProps {
  title: string;
  description?: string;
  /** Buttons shown next to the title, e.g. "Add user". */
  actions?: ReactNode;
  children: ReactNode;
}

/** The standard page body (reference look: p-8, a small bold title, a grey line under it). */
export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  useDocumentTitle(title);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
