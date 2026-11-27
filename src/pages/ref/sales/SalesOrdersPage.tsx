import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { paymentWindow } from './salesTypes';

interface SalesOrderRow {
  id: string;
  number: string;
  status: string;
  buyer: { firmName: string };
  totalPaise: number;
  paymentDueAt: string;
}

/** Sales → Sales orders, as the reference (app/(sales)/sales-orders). */
export function SalesOrdersPage() {
  useDocumentTitle('Sales orders');
  const [salesOrders, setSalesOrders] = useState<SalesOrderRow[]>([]);

  useOnMount(async () => {
    const data = await refGet<{ salesOrders: SalesOrderRow[] }>('/sales-orders', { pageSize: 100 });
    setSalesOrders(data.salesOrders ?? []);
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Sales orders</h1>
        <Link
          to="/sales-orders/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Raise SO
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {salesOrders.map((so) => {
          const window = so.status === 'AWAITING_PAYMENT' ? paymentWindow(so.paymentDueAt) : null;
          return (
            <Link
              key={so.id}
              to={`/sales-orders/${so.id}`}
              className="flex items-center justify-between rounded border border-zinc-200 p-4 hover:bg-zinc-50"
              data-testid="so-row"
            >
              <div className="text-sm">
                <strong>{so.number}</strong> · {so.buyer.firmName} ·{' '}
                {formatPaiseAsINR(so.totalPaise)}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-zinc-100 px-2 py-1 text-zinc-600">{so.status}</span>
                {window && (
                  <span className={window.overdue ? 'text-red-600' : 'text-zinc-500'}>
                    {window.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {salesOrders.length === 0 && <p className="text-sm text-zinc-500">No sales orders yet.</p>}
      </div>
    </div>
  );
}
