import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import type { RefPoRow } from './refTypes';

/** Purchase → Today, as the reference (app/(purchase)/purchase-today): the desk's Stock POs. */
export function PurchaseTodayPage() {
  useDocumentTitle('Today');
  const [stockPos, setStockPos] = useState<RefPoRow[]>([]);

  useOnMount(async () => {
    const data = await refGet<{ purchaseOrders: RefPoRow[] }>('/purchase-orders', {
      type: 'STOCK',
    });
    setStockPos(data.purchaseOrders ?? []);
  });

  const pending = stockPos.filter((p) => p.approvalStatus === 'PENDING_APPROVAL');
  const issued = stockPos.filter((p) => p.approvalStatus === 'ISSUED');

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Today</h1>
        <Link
          to="/purchase-orders/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Raise Stock PO
        </Link>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Stock POs — waiting for Controller approval
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {pending.map((po) => (
          <Link
            key={po.id}
            to={`/purchase-orders/${po.id}`}
            className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-3 text-sm"
          >
            <span>
              <strong>{po.number}</strong> · {po.seller.firmName}
            </span>
            <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
              Pending approval
            </span>
          </Link>
        ))}
        {pending.length === 0 && <p className="text-sm text-zinc-400">Nothing waiting.</p>}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Stock POs — issued
      </h2>
      <div className="flex flex-col gap-2">
        {issued.map((po) => (
          <Link
            key={po.id}
            to={`/purchase-orders/${po.id}`}
            className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm"
          >
            <span>
              <strong>{po.number}</strong> · {po.seller.firmName}
            </span>
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
              Issued
            </span>
          </Link>
        ))}
        {issued.length === 0 && <p className="text-sm text-zinc-400">None yet.</p>}
      </div>
    </div>
  );
}
