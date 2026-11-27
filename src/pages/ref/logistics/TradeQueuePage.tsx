import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import type { BilledBill, DockLot } from './dockTypes';

/**
 * Logistics → Trade queue, as the reference (app/(logistics)/logistics-trade-queue): what waits on the dock check
 * (s5, at the dock) and on the outward dispatch (billed, needs a trip). Movement only, no rates or firm names. In
 * our system Logistics works these from the Dock screen, so each row opens the right Dock tab.
 */
export function TradeQueuePage() {
  useDocumentTitle('Logistics — trade queue');
  const [atDock, setAtDock] = useState<DockLot[]>([]);
  const [billed, setBilled] = useState<BilledBill[]>([]);

  useOnMount(async () => {
    const [dock, bills] = await Promise.all([
      refGet<{ rows: DockLot[] }>('/dock', { lane: 'ARRIVED', pageSize: 100 }),
      refGet<{ bills: BilledBill[] }>('/trips/billed', { pageSize: 100 }),
    ]);
    setAtDock(dock.rows ?? []);
    setBilled(bills.bills ?? []);
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Logistics — trade queue</h1>

      <h2 className="mb-2 text-sm font-semibold text-zinc-700">s5 dock check</h2>
      <div className="mb-6 flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
        {atDock.map((lot) => (
          <Link
            key={lot.purchaseOrderId}
            to="/dock"
            className="block px-4 py-3 text-sm hover:bg-zinc-50"
            data-testid="queue-row"
          >
            {lot.lines.map((l) => `${l.productName} — ${l.packLabel}`).join(', ')} · PO {lot.number}
          </Link>
        ))}
        {atDock.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">Nothing here.</p>}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-zinc-700">
        b9 outward dispatch (needs Marg bill)
      </h2>
      <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
        {billed.map((bill) => (
          <Link
            key={bill.salesOrderId}
            to="/dock"
            className="block px-4 py-3 text-sm hover:bg-zinc-50"
            data-testid="queue-row"
          >
            {bill.items.map((i) => `${i.productName} — ${i.packLabel}`).join(', ')} ·{' '}
            {bill.soNumber}
          </Link>
        ))}
        {billed.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">Nothing here.</p>}
      </div>
    </div>
  );
}
