import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface DeskTab {
  to: string;
  label: string;
  end?: boolean;
  count?: number;
}

/**
 * A desk's screens as one row of tabs (Purchase, Sales). It stays pinned under the top of the
 * window while the page scrolls, and on a narrow screen the row scrolls sideways — with the open
 * tab brought into view — instead of wrapping onto three lines.
 */
export function DeskTabs({ label, items }: { label: string; items: DeskTab[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // Sideways only — scrollIntoView would also move the page under a pinned row.
    const row = rowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active) return;
    const left = active.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + active.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = left - 16;
    }
  }, [pathname]);

  return (
    <nav
      aria-label={label}
      className="sticky top-14 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 md:top-0 md:-mx-8 md:px-8"
    >
      <div
        ref={rowRef}
        className="-mb-px flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${
                isActive
                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {item.label}
            {!!item.count && (
              <span className="min-w-5 rounded-full bg-slate-200 px-1.5 text-center text-xs font-semibold tabular-nums text-slate-700">
                {item.count}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
