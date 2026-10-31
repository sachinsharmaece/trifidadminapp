import { useEffect, useState } from 'react';
import {
  getActiveDemandList,
  getPilesAwaitingDecision,
  getDispatchChaseQueue,
  getInspectionsPendingApply,
  getReturnNoteAgeing,
  getStockQueue,
  getPoQueue,
  getBilledQueue,
} from '../../api/purchase';
import { countPendingRegistrations } from '../../api/onboarding';
import { listPurchasePushes } from '../../api/push';
import { useAuth } from '../../auth/AuthContext';
import { DeskTabs } from '../../components/DeskTabs';

interface NavCounts {
  demand: number;
  confirmations: number;
  stock: number;
  po: number;
  billed: number;
  dispatch: number;
  sellers: number;
  recovery: number;
  fromSales: number;
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
      callApi((token) => countPendingRegistrations(token, 'seller')),
      callApi((token) => getInspectionsPendingApply(token)),
      callApi((token) => getReturnNoteAgeing(token)),
      callApi((token) => getStockQueue(token)),
      callApi((token) => getPoQueue(token)),
      callApi((token) => getBilledQueue(token)),
      callApi((token) => listPurchasePushes(token, 'open')),
    ]).then(
      ([
        demand,
        piles,
        dispatch,
        registrations,
        inspections,
        returns,
        stock,
        pos,
        billed,
        pushes,
      ]) => {
        if (cancelled) return;
        setCounts({
          demand: demand.status === 'fulfilled' ? demand.value.length : undefined,
          confirmations: piles.status === 'fulfilled' ? piles.value.length : undefined,
          // Stock: orders whose hold has run out while the buyer has still not paid.
          stock:
            stock.status === 'fulfilled'
              ? stock.value.filter((s) => s.hold === 'lapsed').length
              : undefined,
          po: pos.status === 'fulfilled' ? pos.value.length : undefined,
          billed: billed.status === 'fulfilled' ? billed.value.length : undefined,
          dispatch:
            dispatch.status === 'fulfilled'
              ? dispatch.value.filter((d) => d.bucket === 'overdue').length
              : undefined,
          sellers: registrations.status === 'fulfilled' ? registrations.value : undefined,
          recovery:
            inspections.status === 'fulfilled' && returns.status === 'fulfilled'
              ? inspections.value.length + returns.value.filter((r) => r.overdue).length
              : undefined,
          fromSales: pushes.status === 'fulfilled' ? pushes.value.length : undefined,
        });
      },
    );
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
  { to: '/purchase/stock', label: 'Hold', countKey: 'stock' },
  { to: '/purchase/po', label: 'PO', countKey: 'po' },
  { to: '/purchase/billed', label: 'Billed', countKey: 'billed' },
  { to: '/purchase/dispatch', label: 'Dispatch', countKey: 'dispatch' },
  { to: '/purchase/sellers', label: 'Sellers', countKey: 'sellers' },
  { to: '/purchase/from-sales', label: 'From Sales', countKey: 'fromSales' },
  { to: '/purchase/matrix', label: 'Supply matrix' },
  { to: '/purchase/recovery', label: 'Recovery', countKey: 'recovery' },
  { to: '/purchase/products', label: 'Products' },
];

/**
 * Purchase-desk v2 — eleven screens, one desk (Stock, PO and Billed sit between Confirmations
 * and Dispatch). This sub-nav sits inside the
 * app's existing sidebar route (`/purchase`), the same way `Manage`'s
 * children do, rather than adding eight new top-level sidebar entries.
 */
export function PurchaseNav() {
  const counts = useNavCounts();
  return (
    <DeskTabs
      label="Purchase screens"
      items={ITEMS.map((item) => ({
        to: item.to,
        label: item.label,
        end: item.end,
        count: item.countKey ? counts[item.countKey] : undefined,
      }))}
    />
  );
}
