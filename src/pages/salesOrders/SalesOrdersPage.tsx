import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useSalesOrders } from '@/features/salesOrders/hooks';
import { SalesOrderStatusBadge } from '@/features/salesOrders/SalesOrderStatusBadge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  SALES_ORDER_STATUSES,
  SALES_ORDER_STATUS_LABELS,
  type SalesOrderStatus,
} from '@/types/salesOrder';
import { dueText, formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;

/**
 * Orders raised when a buyer says yes, newest first. Read only: orders change only through the deal card's
 * buttons (one trade engine). Sales, Accounts and supervisors see this list.
 */
export function SalesOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalesOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const orders = useSalesOrders({ q, status, page, pageSize: PAGE_SIZE });

  return (
    <PageLayout
      title="Sales orders"
      description="Orders raised when a buyer said yes. The buyer pays against the order number."
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1); // a new search starts from the first page
        }}
        searchPlaceholder="Search by order no. or buyer"
        searchLabel="Search sales orders"
      >
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as SalesOrderStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {SALES_ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {SALES_ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>

      {orders.isPending && <Spinner label="Loading orders" className="h-6 w-6 text-brand-600" />}
      {orders.isError && (
        <ErrorState title="Could not load the orders" message={orders.error.message}>
          <Button onClick={() => void orders.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {orders.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 text-right font-medium">Total (incl. GST)</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.data.salesOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No orders here.
                    </td>
                  </tr>
                )}
                {orders.data.salesOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/sales-orders/${order.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {order.number}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <SalesOrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.buyer.number} · {order.buyer.firmName}
                    </td>
                    <td className="px-4 py-3">{order.item}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatRupees(order.totalPaise)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {order.status === 'AWAITING_PAYMENT' ? (
                        <span
                          className={
                            new Date(order.paymentDueAt) < new Date()
                              ? 'font-medium text-red-700'
                              : 'text-slate-600'
                          }
                        >
                          Due {dueText(order.paymentDueAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
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
