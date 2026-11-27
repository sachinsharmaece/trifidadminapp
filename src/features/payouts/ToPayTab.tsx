import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { FormField } from '@/components/molecules/FormField';
import { useBankAccounts } from '@/features/bankAccounts/hooks';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateBuild } from '@/schemas/payoutForms';
import { boxesText, formatDate, formatRupees } from '@/utils/format';
import { useBuildBatch, usePayables } from './hooks';

/** Add or take away one id in a list of ticked ids. */
const toggled = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

/**
 * "To pay": checked purchase orders (the seller's bill on file) and refunds due that are in no batch yet. Accounts
 * ticks what to pay, chooses the bank account the money leaves from, and builds a batch (a draft: someone else
 * releases it). The Controller only looks.
 */
export function ToPayTab({ canBuild, onBuilt }: { canBuild: boolean; onBuilt: () => void }) {
  const payables = usePayables();
  const banks = useBankAccounts(true);
  const build = useBuildBatch();
  const [bankLedgerId, setBankLedgerId] = useState('');
  const [purchaseOrderIds, setPurchaseOrderIds] = useState<string[]>([]);
  const [refundIds, setRefundIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  if (payables.isPending)
    return <Spinner label="Loading payments" className="h-6 w-6 text-brand-600" />;
  if (payables.isError) {
    return (
      <ErrorState title="Could not load the payments" message={payables.error.message}>
        <Button onClick={() => void payables.refetch()}>Try again</Button>
      </ErrorState>
    );
  }
  const { purchaseOrders, refunds } = payables.data;

  // Only what is still in the list counts (another person may have taken one into a batch).
  const pickedOrders = purchaseOrders.filter((order) => purchaseOrderIds.includes(order.id));
  const pickedRefunds = refunds.filter((refund) => refundIds.includes(refund.id));
  const totalPaise =
    pickedOrders.reduce((sum, order) => sum + order.netPaise, 0) +
    pickedRefunds.reduce((sum, refund) => sum + refund.amountPaise, 0);

  function submit() {
    const result = validateBuild({
      bankLedgerId,
      purchaseOrderIds: pickedOrders.map((order) => order.id),
      refundIds: pickedRefunds.map((refund) => refund.id),
    });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    build.mutate(result.data, {
      onSuccess: () => {
        setPurchaseOrderIds([]);
        setRefundIds([]);
        onBuilt();
      },
      onError: (caught) => setErrors(serverFieldErrors(caught)),
    });
  }

  if (purchaseOrders.length === 0 && refunds.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Nothing is waiting to be paid.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Sellers to pay</h2>
        {purchaseOrders.length === 0 && (
          <p className="text-sm text-slate-500">No purchase order is waiting for payment.</p>
        )}
        <ul className="space-y-2">
          {purchaseOrders.map((order) => (
            <li key={order.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  aria-label={`Pay ${order.number}`}
                  disabled={!canBuild || order.waiting !== null}
                  checked={purchaseOrderIds.includes(order.id)}
                  onChange={() => setPurchaseOrderIds((ids) => toggled(ids, order.id))}
                />
                <span className="space-y-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      to={`/purchase-orders/${order.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {order.number}
                    </Link>
                    <span>
                      {order.seller.firmName} ({order.seller.number})
                    </span>
                  </span>
                  <span className="block text-slate-600">
                    {boxesText(order.acceptedBoxes)} accepted ·{' '}
                    {order.freightPaise > 0 && (
                      <>
                        {formatRupees(order.acceptedValuePaise)} less{' '}
                        {formatRupees(order.freightPaise)} freight paid at Indore ={' '}
                      </>
                    )}
                    <span className="font-semibold text-slate-900">
                      {formatRupees(order.netPaise)}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {order.sellerBill
                      ? `Seller bill ${order.sellerBill.number} · ${formatRupees(order.sellerBill.amountPaise)} · ${order.sellerBill.billDate}`
                      : 'No seller bill yet'}
                    {order.inspectedAt ? ` · checked ${formatDate(order.inspectedAt)}` : ''}
                  </span>
                  {order.waiting && <span className="block text-amber-700">{order.waiting}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Refunds due to buyers</h2>
        {refunds.length === 0 && <p className="text-sm text-slate-500">No refund is due.</p>}
        <ul className="space-y-2">
          {refunds.map((refund) => (
            <li key={refund.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  aria-label={`Pay ${refund.number}`}
                  disabled={!canBuild}
                  checked={refundIds.includes(refund.id)}
                  onChange={() => setRefundIds((ids) => toggled(ids, refund.id))}
                />
                <span className="space-y-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">{refund.number}</span>
                    <span>
                      {refund.buyer.firmName} ({refund.buyer.number})
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatRupees(refund.amountPaise)}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {refund.reason} · {boxesText(refund.boxes)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {canBuild ? (
        <section className="space-y-3 rounded-lg border border-brand-200 bg-white p-5">
          <h2 className="text-base font-semibold">Build a payout batch</h2>
          <p className="text-sm text-slate-600">
            The batch is a draft. The Founder or Admin releases it (not the person who built it),
            then you pay at the bank and type each UTR. A line counts as paid only when its UTR is
            typed.
          </p>
          <ErrorAlert message={build.error?.message} />
          <FormField label="Pay from" required error={errors.bankLedgerId}>
            {(field) => (
              <Select
                {...field}
                value={bankLedgerId}
                onChange={(event) => setBankLedgerId(event.target.value)}
              >
                <option value="">Choose a bank account…</option>
                {banks.data?.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          {errors.purchaseOrderIds && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errors.purchaseOrderIds}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={build.isPending} onClick={submit}>
              Build batch
            </Button>
            <span className="text-sm text-slate-600" aria-live="polite">
              {pickedOrders.length + pickedRefunds.length} ticked · {formatRupees(totalPaise)}
            </span>
          </div>
        </section>
      ) : (
        <p className="text-xs text-slate-500">Accounts builds the batches.</p>
      )}
    </div>
  );
}
