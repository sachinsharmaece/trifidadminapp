import type { ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

/**
 * A card whose body folds away under its title. `anchorPrefix` + `id` make the element's DOM id,
 * so a funnel row elsewhere on the page can scroll to the section it summarises.
 */
export function DropdownCard<T extends string>({
  id,
  anchorPrefix,
  open,
  onToggle,
  title,
  count,
  children,
}: {
  id: T;
  anchorPrefix: string;
  open: boolean;
  onToggle: (id: T) => void;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section
      id={`${anchorPrefix}-${id}`}
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <h2 className="text-base font-semibold text-slate-900">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-normal text-slate-500">({count})</span>
          )}
        </h2>
        <FiChevronDown
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
