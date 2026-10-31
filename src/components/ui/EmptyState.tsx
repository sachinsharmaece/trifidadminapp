import type { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';

export function EmptyState({
  message,
  title,
  action,
}: {
  message: string;
  /** A bolder line above the message, when the screen wants one. */
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
        <FiInbox aria-hidden />
      </span>
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
