import { useEffect, useState } from 'react';
import { getComplaintQueue, getMspQueue } from '../../api/sales';
import { useAuth } from '../../auth/AuthContext';
import { DeskTabs } from '../../components/DeskTabs';

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
  { to: '/sales/pushed', label: 'Pushed to Purchase' },
];

/**
 * Sales-desk v2 — nine screens, one desk. This sub-nav sits inside the app's
 * existing sidebar route (`/sales`), the same shape as `PurchaseNav`: real
 * routes via `NavLink`, not a generic tabs component.
 */
export function SalesNav() {
  const counts = useNavCounts();
  return (
    <DeskTabs
      label="Sales screens"
      items={ITEMS.map((item) => ({
        to: item.to,
        label: item.label,
        end: item.end,
        count: item.countKey ? counts[item.countKey] : undefined,
      }))}
    />
  );
}
