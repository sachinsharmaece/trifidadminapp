import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getComplaintQueue, getMspQueue } from '../../api/sales';
import { useAuth } from '../../auth/AuthContext';

interface NavCounts {
  msp: number;
  complaints: number;
}

/** Best-effort — a badge that fails to load just shows nothing, never blocks the nav. */
function useNavCounts(): Partial<NavCounts> {
  const { callApi } = useAuth();
  const [counts, setCounts] = useState<Partial<NavCounts>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      callApi((token) => getMspQueue(token)),
      callApi((token) => getComplaintQueue(token)),
    ]).then(([msp, complaints]) => {
      if (cancelled) return;
      setCounts({
        msp: msp.status === 'fulfilled' ? msp.value.length : undefined,
        complaints: complaints.status === 'fulfilled' ? complaints.value.length : undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [callApi]);

  return counts;
}

const ITEMS: Array<{ to: string; label: string; end?: boolean; countKey?: keyof NavCounts }> = [
  { to: '/sales', label: 'Today', end: true },
  { to: '/sales/funnel', label: 'Funnel' },
  { to: '/sales/products', label: 'Products' },
  { to: '/sales/pools', label: 'Pools' },
  { to: '/sales/orders', label: 'Orders' },
  { to: '/sales/buyers', label: 'Buyers' },
  { to: '/sales/pulse', label: 'Pulse' },
  { to: '/sales/msp', label: 'MSP', countKey: 'msp' },
  { to: '/sales/complaints', label: 'Complaints', countKey: 'complaints' },
];

/**
 * Sales-desk v2 — nine screens, one desk. This sub-nav sits inside the app's
 * existing sidebar route (`/sales`), the same shape as `PurchaseNav`: real
 * routes via `NavLink`, not a generic tabs component.
 */
export function SalesNav() {
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
