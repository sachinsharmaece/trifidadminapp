import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { PurchaseOrderStatusBadge } from '@/features/purchaseOrders/PurchaseOrderProgress';
import { usePurchaseOrders } from '@/features/purchaseOrders/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { dueText, formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;

/**
 * Purchase orders, newest first. Read only: a PO is raised when Accounts confirms that the buyer has paid his
 * order in full. A PO names the seller and his rate, never the buyer (Purchase, Accounts, supervisors).
 */
export function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const orders = usePurchaseOrders({ q, page, pageSize: PAGE_SIZE });

  return (
    <PageLayout
      title="Purchase orders"
      description="Raised when a buyer has paid his order in full. The seller should dispatch by the time shown."
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Search by PO no. or seller"
        searchLabel="Search purchase orders"
      />
      {orders.isPending && <Spinner label="Loading POs" className="h-6 w-6 text-brand-600" />}
      {orders.isError && (
        <ErrorState title="Could not load the purchase orders" message={orders.error.message}>
          <Button onClick={() => void orders.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {orders.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">PO</th>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.data.purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
                {orders.data.purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/purchase-orders/${po.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {po.number}
                      </Link>
                      <div className="text-xs text-slate-500">{formatDateTime(po.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {po.seller.number} · {po.seller.firmName}
                    </td>
                    <td className="px-4 py-3">{po.item}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatRupees(po.totalPaise)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <PurchaseOrderStatusBadge status={po.status} />
                      {po.status === 'RAISED' && (
                        <div className="mt-1">Dispatch {dueText(po.dispatchDueAt)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={orders.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
