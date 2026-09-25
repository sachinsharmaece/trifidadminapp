import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  getActiveDemandList,
  getPilesAwaitingDecision,
  getDispatchChaseQueue,
  getInspectionsPendingApply,
  getReturnNoteAgeing,
} from '../../api/purchase';
import { listRegistrations } from '../../api/onboarding';
import { useAuth } from '../../auth/AuthContext';

interface NavCounts {
  demand: number;
  confirmations: number;
  dispatch: number;
  sellers: number;
  recovery: number;
}

/** Best-effort — a badge that fails to load just shows nothing, never blocks the nav. */
function useNavCounts(): Partial<NavCounts> {
  const { callApi } = useAuth();
  const [counts, setCounts] = useState<Partial<NavCounts>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      callApi((token) => getActiveDemandList(token, false)),
      callApi((token) => getPilesAwaitingDecision(token)),
      callApi((token) => getDispatchChaseQueue(token)),
      callApi((token) => listRegistrations(token, 'pending')),
      callApi((token) => getInspectionsPendingApply(token)),
      callApi((token) => getReturnNoteAgeing(token)),
    ]).then(([demand, piles, dispatch, registrations, inspections, returns]) => {
      if (cancelled) return;
      setCounts({
        demand: demand.status === 'fulfilled' ? demand.value.length : undefined,
        confirmations: piles.status === 'fulfilled' ? piles.value.length : undefined,
        dispatch:
          dispatch.status === 'fulfilled'
            ? dispatch.value.filter((d) => d.bucket === 'overdue').length
            : undefined,
        sellers:
          registrations.status === 'fulfilled'
            ? registrations.value.filter((r) => r.kind !== 'buyer').length
            : undefined,
        recovery:
          inspections.status === 'fulfilled' && returns.status === 'fulfilled'
            ? inspections.value.length + returns.value.filter((r) => r.overdue).length
            : undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [callApi]);

  return counts;
}

const ITEMS: Array<{ to: string; label: string; end?: boolean; countKey?: keyof NavCounts }> = [
  { to: '/purchase', label: 'Today', end: true },
  { to: '/purchase/demand', label: 'Demand', countKey: 'demand' },
  { to: '/purchase/confirmations', label: 'Confirmations', countKey: 'confirmations' },
  { to: '/purchase/dispatch', label: 'Dispatch', countKey: 'dispatch' },
  { to: '/purchase/sellers', label: 'Sellers', countKey: 'sellers' },
  { to: '/purchase/matrix', label: 'Supply matrix' },
  { to: '/purchase/recovery', label: 'Recovery', countKey: 'recovery' },
  { to: '/purchase/products', label: 'Products' },
];

/**
 * Purchase-desk v2 — eight screens, one desk. This sub-nav sits inside the
 * app's existing sidebar route (`/purchase`), the same way `Manage`'s
 * children do, rather than adding eight new top-level sidebar entries.
 */
export function PurchaseNav() {
  const counts = useNavCounts();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      {ITEMS.map((item) => {
        const count = item.countKey ? counts[item.countKey] : undefined;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {item.label}
            {!!count && (
              <span className="rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-700">
                {count}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
