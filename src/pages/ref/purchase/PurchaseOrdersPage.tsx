import { useState } from 'react';
import { Link } from 'react-router';
import { useCurrentUser } from '@/features/auth/hooks';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import type { RefPoRow } from './refTypes';

/** Purchase → Purchase orders, as the reference (app/(purchase)/purchase-orders): trade and Stock POs together. */
export function PurchaseOrdersPage() {
  useDocumentTitle('Purchase orders');
  const { data: me } = useCurrentUser();
  const canApproveStock =
    me?.role === 'ADMIN' || me?.role === 'CONTROLLER' || me?.role === 'FOUNDER';
  const [purchaseOrders, setPurchaseOrders] = useState<RefPoRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await refGet<{ purchaseOrders: RefPoRow[] }>('/purchase-orders', { type: 'ALL' });
    setPurchaseOrders(data.purchaseOrders ?? []);
  }

  useOnMount(load);

  async function approve(id: string) {
    setError(null);
    const res = await refSend('POST', `/purchase-orders/${id}/approve`);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Purchase orders</h1>
        <Link
          to="/purchase-orders/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Raise PO
        </Link>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {purchaseOrders.map((po) => (
          <div
            key={po.id}
            className="flex items-center justify-between gap-2 rounded border border-zinc-200 p-4 hover:bg-zinc-50"
            data-testid="po-row"
          >
            <Link to={`/purchase-orders/${po.id}`} className="flex-1 text-sm">
              <strong>{po.number}</strong>
              {po.type === 'STOCK' ? (
                <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Stock
                </span>
              ) : (
                <> · {po.salesOrderNumber}</>
              )}
              <> · {po.seller.firmName}</>
            </Link>
            {po.type === 'STOCK' ? (
              <span
                className={`rounded px-2 py-1 text-xs ${po.approvalStatus === 'ISSUED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
              >
                {po.approvalStatus === 'ISSUED' ? 'Issued' : 'Pending approval'}
              </span>
            ) : (
              <span
                className={`rounded px-2 py-1 text-xs ${po.payable?.payable ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}
              >
                {po.payable?.payable ? 'Payable' : (po.payable?.reasons ?? []).join(', ')}
              </span>
            )}
            {po.type === 'STOCK' && po.approvalStatus === 'PENDING_APPROVAL' && canApproveStock && (
              <button
                type="button"
                onClick={() => void approve(po.id)}
                className="min-h-11 rounded border border-zinc-300 px-3 text-xs"
              >
                Approve
              </button>
            )}
          </div>
        ))}
        {purchaseOrders.length === 0 && (
          <p className="text-sm text-zinc-500">No purchase orders yet.</p>
        )}
      </div>
    </div>
  );
}
