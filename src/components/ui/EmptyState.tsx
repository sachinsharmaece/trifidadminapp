import type { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-500">
      <FiInbox className="text-2xl text-slate-300" aria-hidden />
      <p>{message}</p>
      {action}
    </div>
  );
}
