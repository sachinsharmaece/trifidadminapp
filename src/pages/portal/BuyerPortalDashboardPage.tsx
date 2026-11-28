import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';

interface Ask {
  id: string;
  humanCode: string;
  product: string;
  pack: string | null;
  quantity: number;
  status: string;
}
interface SalesOrder {
  id: string;
  humanNumber: string;
  status: string;
  totalDisplay: string;
}
interface Confirmation {
  id: string;
  product: string | null;
  pack: string | null;
  status: string;
  quantityBoxes: number;
  confirmedBoxes: number | null;
}

/** The buyer's own orders, confirmations and asks (reference app/portal/buyer/dashboard). */
export function BuyerPortalDashboardPage() {
  useDocumentTitle('Buyer Portal');
  const [asks, setAsks] = useState<Ask[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useOnMount(async () => {
    const [asksData, soData, confData] = await Promise.all([
      refGet<{ asks: Ask[] }>('/portal/buyer/asks'),
      refGet<{ salesOrders: SalesOrder[] }>('/portal/buyer/sales-orders'),
      refGet<{ confirmations: Confirmation[] }>('/portal/buyer/confirmations'),
    ]);
    setAsks(asksData.asks ?? []);
    setSalesOrders(soData.salesOrders ?? []);
    setConfirmations(confData.confirmations ?? []);
    setLoading(false);
  });

  if (loading) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">My orders</h2>
        <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
          {salesOrders.map((so) => (
            <div key={so.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{so.humanNumber}</span>
              <span className="text-zinc-500">{so.status}</span>
              <strong>{so.totalDisplay}</strong>
            </div>
          ))}
          {salesOrders.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-400">No orders yet.</p>
          )}
        </div>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">My confirmations</h2>
        <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
          {confirmations.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {c.product ?? '—'} {c.pack && `— ${c.pack}`}
              </span>
              <span className="text-zinc-500">{c.status}</span>
              <span>{c.confirmedBoxes ?? c.quantityBoxes} boxes</span>
            </div>
          ))}
          {confirmations.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-400">No confirmations yet.</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">My asks</h2>
        <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
          {asks.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {a.product} {a.pack && `— ${a.pack}`}
              </span>
              <span className="text-zinc-500">{a.quantity} boxes</span>
              <span className="text-xs text-zinc-400">{a.status}</span>
            </div>
          ))}
          {asks.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">No asks yet.</p>}
        </div>
      </section>
    </div>
  );
}
