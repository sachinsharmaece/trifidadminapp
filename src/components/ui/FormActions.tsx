import type { ReactNode } from 'react';

/**
 * A long form's buttons, pinned to the bottom of the window while the form scrolls past —
 * so Save is always in reach — and resting in place at the form's end. Spans every column
 * of a grid form.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 col-span-full -mx-1 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      {children}
    </div>
  );
}
