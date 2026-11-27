import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { ComplaintLines } from '@/features/complaints/ComplaintLines';
import { RefundLine } from '@/features/payouts/RefundLine';
import { useSalesOrder } from '@/features/salesOrders/hooks';
import { billingRows } from '@/features/billing/billingRows';
import { SalesOrderStatusBadge } from '@/features/salesOrders/SalesOrderStatusBadge';
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_TONES } from '@/types/books';
import { RATE_TIER_LABELS } from '@/types/party';
import { dueText, formatDateTime, formatPercent, formatRupees } from '@/utils/format';

/** Who may open the deal card behind an order (Accounts reads orders but not trades). */
const SEES_TRADES = ['SALES', 'CONTROLLER', 'FOUNDER', 'ADMIN'];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * One sales order, read only: the buyer as he was when he said yes, the frozen line, and the GST inside the
 * total. Supervisors also see the seller and his rate (the API leaves them out for everyone else).
 */
export function SalesOrderPage() {
  const { id = '' } = useParams();
  const order = useSalesOrder(id);
  const { data: me } = useCurrentUser();

  if (order.isPending) return <Spinner label="Loading order" className="h-6 w-6 text-brand-600" />;
  if (order.isError) {
    return (
      <ErrorState title="Could not load this order" message={order.error.message}>
        <Button onClick={() => void order.refetch()}>Try again</Button>
        <Link to="/sales-orders" className="text-sm font-medium text-brand-700 hover:underline">
          Back to sales orders
        </Link>
      </ErrorState>
    );
  }

  const data = order.data;
  const awaiting = data.status === 'AWAITING_PAYMENT';
  const overdue = awaiting && new Date(data.paymentDueAt) < new Date();
  const seesSeller = data.lines.some((line) => line.landedPaisePerUnit !== undefined);

  return (
    <PageLayout
      title={data.number}
      description={`${data.buyer.number} · ${data.buyer.firmName} · raised ${formatDateTime(data.createdAt)}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <SalesOrderStatusBadge status={data.status} />
        {awaiting && (
          <span className={overdue ? 'font-medium text-red-700' : 'text-slate-600'}>
            Payment due {dueText(data.paymentDueAt)}
          </span>
        )}
        {me && SEES_TRADES.includes(me.role) && (
          <Link
            to={`/trades/${data.tradeId}`}
            className="font-medium text-brand-700 hover:underline"
          >
            Open the deal card
          </Link>
        )}
      </div>

      {data.cancel && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Cancelled {formatDateTime(data.cancel.at)}: {data.cancel.reasonLabel}
          {data.cancel.note ? ` (${data.cancel.note})` : ''}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Buyer (as on the order)</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Fact label="Buyer">
            {data.buyer.number} · {data.buyer.firmName}
          </Fact>
          <Fact label="GSTIN">{data.buyer.gstin ?? 'None (not registered)'}</Fact>
          <Fact label="Delivery location">{data.buyer.deliveryLocation}</Fact>
          <Fact label="Priced as">
            {RATE_TIER_LABELS[data.buyer.rateTier]}
            {data.buyer.classified ? '' : ' (indicative: not classified yet)'}
          </Fact>
          {data.seller !== undefined && (
            <Fact label="Seller (supervisors only)">
              {data.seller ? `${data.seller.number} · ${data.seller.firmName}` : '—'}
            </Fact>
          )}
        </dl>
      </section>

      <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">HSN · GST</th>
              <th className="px-4 py-3 font-medium">Expiry · batch</th>
              <th className="px-4 py-3 text-right font-medium">Rate per unit</th>
              {seesSeller && <th className="px-4 py-3 text-right font-medium">Seller rate</th>}
              <th className="px-4 py-3 text-right font-medium">Box value</th>
              <th className="px-4 py-3 text-right font-medium">Boxes</th>
              <th className="px-4 py-3 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.lines.map((line) => (
              <tr key={line.lineNo}>
                <td className="px-4 py-3">
                  {line.productName} · {line.packLabel}
                  <div className="text-xs text-slate-500">{line.unitsPerBox} per box</div>
                </td>
                <td className="px-4 py-3">
                  {line.hsnCode} · {formatPercent(line.taxBp)}
                </td>
                <td className="px-4 py-3">
                  {line.expiryMonth}
                  {line.batchNumber ? ` · ${line.batchNumber}` : ''}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatRupees(line.buyerRatePaisePerUnit)}
                </td>
                {seesSeller && (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {line.landedPaisePerUnit === undefined
                      ? '—'
                      : formatRupees(line.landedPaisePerUnit)}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatRupees(line.boxValuePaise)}
                </td>
                <td className="px-4 py-3 text-right">{line.boxes}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                  {formatRupees(line.lineTotalPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Total</h2>
        <p className="mt-1 text-xs text-slate-500">
          Rates include GST. The tax below is worked back out of the total
          {data.interState ? ' (another state: IGST).' : ' (Madhya Pradesh: CGST + SGST).'}
        </p>
        <dl className="mt-3 grid max-w-md grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-600">Taxable value</dt>
          <dd className="text-right">{formatRupees(data.gst.taxablePaise)}</dd>
          {data.interState ? (
            <>
              <dt className="text-slate-600">IGST</dt>
              <dd className="text-right">{formatRupees(data.gst.igstPaise)}</dd>
            </>
          ) : (
            <>
              <dt className="text-slate-600">CGST</dt>
              <dd className="text-right">{formatRupees(data.gst.cgstPaise)}</dd>
              <dt className="text-slate-600">SGST</dt>
              <dd className="text-right">{formatRupees(data.gst.sgstPaise)}</dd>
            </>
          )}
          <dt className="border-t border-slate-200 pt-1 font-semibold">Total (incl. GST)</dt>
          <dd className="border-t border-slate-200 pt-1 text-right font-semibold">
            {formatRupees(data.totalPaise)}
          </dd>
          <dt className="text-slate-600">Received (confirmed)</dt>
          <dd className="text-right">{formatRupees(data.paidPaise)}</dd>
          <dt className="font-semibold">Still due</dt>
          <dd className="text-right font-semibold">
            {formatRupees(data.status === 'CANCELLED' ? 0 : data.totalPaise - data.paidPaise)}
          </dd>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sales enters what the buyer paid; it counts once Accounts confirms it. The PO goes to the
          seller when the order is paid in full.
        </p>
        {data.payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None entered yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {data.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{formatRupees(payment.amountPaise)}</span>
                <span className="text-slate-600">
                  {payment.number} · UTR {payment.utr} · {payment.bankName} · {payment.receivedOn}
                </span>
                <Badge tone={RECEIPT_STATUS_TONES[payment.status]}>
                  {RECEIPT_STATUS_LABELS[payment.status]}
                </Badge>
                {payment.rejectNote && (
                  <span className="text-xs text-red-700">{payment.rejectNote}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data.margBill ?? data.status === 'PAID') && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Billing and delivery</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {billingRows({ margBill: data.margBill, ...data.delivery }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {data.complaints.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Complaints</h2>
          <p className="mt-1 text-xs text-slate-500">
            Raised by Sales inside the delivery window; the Controller decides. A credit note or a
            refund is posted to the buyer&apos;s account.
          </p>
          <div className="mt-3">
            <ComplaintLines complaints={data.complaints} />
          </div>
        </section>
      )}

      {data.refunds.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Refund to the buyer</h2>
          <p className="mt-1 text-xs text-slate-500">
            Boxes the dock found short, damaged or leaking, at this order&apos;s rate. Accounts pays
            it from the Payouts screen; it is paid when the bank proof is typed.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {data.refunds.map((refund) => (
              <RefundLine key={refund.id} refund={refund} />
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
}
