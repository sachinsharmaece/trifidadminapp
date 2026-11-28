import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';

interface Listing {
  id: string;
  product: string;
  pack: string;
  rateDisplay: string;
  status: string;
}
interface Confirmation {
  id: string;
  product: string | null;
  pack: string | null;
  status: string;
  quantityBoxes: number;
  confirmedBoxes: number | null;
}
interface PurchaseOrder {
  id: string;
  humanNumber: string;
  dispatchedAt: string | null;
  goodsInAt: string | null;
  sellerBillAt: string | null;
  paidAt: string | null;
  lines: { id: string; product: string; pack: string; boxes: number }[];
}

/**
 * Where his PO stands. The reference reads Paid › Dispatched (our dock to the buyer) › Bill received › Goods
 * received; ours follows the seller's own steps: Paid › Goods received › Bill received › Dispatched.
 */
function poStatus(po: PurchaseOrder): string {
  if (po.paidAt) return 'Paid';
  if (po.goodsInAt) return 'Goods received';
  if (po.sellerBillAt) return 'Bill received';
  if (po.dispatchedAt) return 'Dispatched';
  return 'Awaiting dispatch';
}

/** The seller's own POs, confirmations and listings (reference app/portal/seller/dashboard). */
export function SellerPortalDashboardPage() {
  useDocumentTitle('Seller Portal');
  const [listings, setListings] = useState<Listing[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useOnMount(async () => {
    const [listingsData, confData, poData] = await Promise.all([
      refGet<{ listings: Listing[] }>('/portal/seller/listings'),
      refGet<{ confirmations: Confirmation[] }>('/portal/seller/confirmations'),
      refGet<{ purchaseOrders: PurchaseOrder[] }>('/portal/seller/purchase-orders'),
    ]);
    setListings(listingsData.listings ?? []);
    setConfirmations(confData.confirmations ?? []);
    setPurchaseOrders(poData.purchaseOrders ?? []);
    setLoading(false);
  });

  if (loading) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">My purchase orders</h2>
        <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
          {purchaseOrders.map((po) => (
            <div key={po.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{po.humanNumber}</span>
                <span className="text-zinc-500">{poStatus(po)}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {po.lines.map((l) => `${l.product} — ${l.pack} × ${l.boxes}`).join(', ')}
              </div>
            </div>
          ))}
          {purchaseOrders.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-400">No purchase orders yet.</p>
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
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">My listings</h2>
        <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
          {listings.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {l.product} — {l.pack}
              </span>
              <strong>{l.rateDisplay}</strong>
              <span className="text-xs text-zinc-400">{l.status}</span>
            </div>
          ))}
          {listings.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-400">No listings yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
