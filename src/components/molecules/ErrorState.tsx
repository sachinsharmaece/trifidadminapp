import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title: string;
  message?: string | undefined;
  /** Buttons or links, e.g. "Try again". */
  children?: ReactNode;
  className?: string;
}

/** A centered "something went wrong" block, reused by the error boundary, the route error page and tables. */
export function ErrorState({ title, message, children, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
