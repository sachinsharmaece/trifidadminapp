import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { formatRupees } from '@/utils/format';
import { useAdvances, useSpendAdvance } from './hooks';

/**
 * Buyers who paid ahead: the money each holds, and his orders that are waiting for payment. "Use the advance"
 * pays an order from that money (oldest payment first, never more than the order still needs). When the order is
 * paid in full the purchase order goes out, exactly as when a payment is confirmed. Accounts cannot open the deal
 * card, so this is where it presses the same engine action.
 */
export function AdvancesTab({ canAct }: { canAct: boolean }) {
  const advances = useAdvances();
  const spend = useSpendAdvance();

  if (advances.isPending)
    return <Spinner label="Loading advances" className="h-6 w-6 text-brand-600" />;
  if (advances.isError) {
    return (
      <ErrorState title="Could not load the advances" message={advances.error.message}>
        <Button onClick={() => void advances.refetch()}>Try again</Button>
      </ErrorState>
    );
  }
  if (advances.data.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No buyer holds an advance. Money that comes with no order is added with “Add a payment”.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <ErrorAlert message={spend.error?.message} />
      {spend.isSuccess && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {spend.data.order.number}: {formatRupees(spend.data.order.paidPaise)} of{' '}
          {formatRupees(spend.data.order.totalPaise)} is paid
          {spend.data.order.status === 'PAID'
            ? ' (paid in full: the purchase order goes out).'
            : '.'}
        </p>
      )}
      <ul className="space-y-3">
        {advances.data.map((item) => (
          <li
            key={item.buyer.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-semibold">
                {item.buyer.number} · {item.buyer.firmName}
              </span>
              <span className="font-medium text-emerald-700">
                {formatRupees(item.advancePaise)} advance
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {item.payments.map((payment) => (
                <li key={payment.id}>
                  {payment.number} · UTR {payment.utr} · {payment.receivedOn} ·{' '}
                  {formatRupees(payment.unspentPaise)} not used
                </li>
              ))}
            </ul>
            {item.orders.length === 0 ? (
              <p className="text-slate-500">No order of this buyer is waiting for payment.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {item.orders.map((order) => (
                  <li key={order.salesOrderId} className="flex flex-wrap items-center gap-3 py-2">
                    <Link
                      to={`/sales-orders/${order.salesOrderId}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {order.number}
                    </Link>
                    <span className="text-slate-600">
                      due {formatRupees(order.duePaise)} of {formatRupees(order.totalPaise)}
                    </span>
                    {canAct ? (
                      <Button
                        size="sm"
                        loading={
                          spend.isPending && spend.variables.salesOrderId === order.salesOrderId
                        }
                        onClick={() => spend.mutate(order)}
                      >
                        Use the advance
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">Accounts does this</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
