import { Link, useParams } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { sellerPayoutRows } from '@/features/payouts/payoutText';
import { usePurchaseOrder } from '@/features/purchaseOrders/hooks';
import { useDownload } from '@/features/reports/hooks';
import {
  PurchaseOrderStatusBadge,
  purchaseOrderProgressRows,
} from '@/features/purchaseOrders/PurchaseOrderProgress';
import { OUTCOME_LABELS, RETURN_NOTE_TYPE_LABELS } from '@/types/dock';
import { boxesText, dueText, formatDate, formatDateTime, formatRupees } from '@/utils/format';

/** Who may open the deal card behind a PO (Accounts reads POs but not trades). */
const SEES_TRADES = ['PURCHASE', 'CONTROLLER', 'FOUNDER', 'ADMIN'];

/**
 * One purchase order, read only: the seller, the line at his rate, then what happened to it: dispatch, the
 * seller's bill, arrival, the dock check (per line) and any return notes. The buttons are on the deal card.
 */
export function PurchaseOrderPage() {
  const { id = '' } = useParams();
  const po = usePurchaseOrder(id);
  const { data: me } = useCurrentUser();
  const document = useDownload();

  if (po.isPending) return <Spinner label="Loading PO" className="h-6 w-6 text-brand-600" />;
  if (po.isError) {
    return (
      <ErrorState title="Could not load this purchase order" message={po.error.message}>
        <Button onClick={() => void po.refetch()}>Try again</Button>
        <Link to="/purchase-orders" className="text-sm font-medium text-brand-700 hover:underline">
          Back to purchase orders
        </Link>
      </ErrorState>
    );
  }
  const data = po.data;
  return (
    <PageLayout
      title={data.number}
      description={`${data.seller.number} · ${data.seller.firmName} · raised ${formatDateTime(data.createdAt)}`}
      actions={
        <Button
          variant="secondary"
          loading={document.isPending}
          onClick={() =>
            document.mutate({
              path: `/purchase-orders/${data.id}/document`,
              fallbackName: `${data.number}.pdf`,
            })
          }
        >
          Purchase order (PDF)
        </Button>
      }
    >
      <ErrorAlert message={document.error?.message} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <PurchaseOrderStatusBadge status={data.status} />
        {data.paidAt && <Badge tone="success">Seller paid</Badge>}
        {data.status === 'RAISED' && (
          <span className="text-slate-600">Seller to dispatch {dueText(data.dispatchDueAt)}</span>
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <h2 className="font-semibold text-slate-900">Seller</h2>
        <p className="mt-2">
          {data.seller.number} · {data.seller.firmName}
        </p>
        <p className="text-xs text-slate-500">GSTIN {data.seller.gstin ?? 'none'}</p>
      </section>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Expiry · batch</th>
              <th className="px-4 py-3 text-right font-medium">Rate per unit (landed)</th>
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
                  {line.expiryMonth}
                  {line.batchNumber ? ` · ${line.batchNumber}` : ''}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatRupees(line.landedPaisePerUnit)}
                  {line.rateType === 'EX' && line.exRatePaisePerUnit !== null && (
                    <div className="text-xs text-slate-500">
                      Ex {formatRupees(line.exRatePaisePerUnit)} + carriage{' '}
                      {formatRupees(line.colPaisePerBox ?? 0)}/box
                    </div>
                  )}
                  {line.rateType === 'FOR' && <div className="text-xs text-slate-500">FOR</div>}
                </td>
                <td className="px-4 py-3 text-right">{line.boxes}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                  {formatRupees(line.lineTotalPaise)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                Total
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                {formatRupees(data.totalPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <h2 className="font-semibold text-slate-900">Dispatch and dock</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {[
            ...purchaseOrderProgressRows(data),
            ...sellerPayoutRows(data.payout, data.status === 'CHECKED'),
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {data.inspection && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">
            Dock check · {OUTCOME_LABELS[data.inspection.outcome]}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(data.inspection.savedAt)} · {data.inspection.boxesCounted} boxes counted
            {data.inspection.note ? ` · ${data.inspection.note}` : ''}
          </p>
          <ul className="mt-3 space-y-2">
            {data.inspection.lines.map((line) => {
              const notes = [
                line.batchDiffers ? `batch found ${line.batchFound ?? '—'} (differs)` : '',
                line.expiryDiffers ? `expiry found ${line.expiryFound ?? '—'} (differs)` : '',
                line.belowShelfLife ? 'short shelf life' : '',
              ].filter(Boolean);
              return (
                <li key={line.lineNo}>
                  Line {line.lineNo}: {line.boxesAccepted} of {line.boxesOnPo} accepted
                  {line.boxesShort ? ` · ${line.boxesShort} short` : ''}
                  {line.boxesDamaged ? ` · ${line.boxesDamaged} damaged` : ''}
                  {line.boxesLeaking ? ` · ${line.boxesLeaking} leaking` : ''}
                  {line.boxesExcess ? ` · ${line.boxesExcess} extra` : ''}
                  {notes.length > 0 && (
                    <div className="text-xs text-amber-700">Note: {notes.join(', ')}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {data.returnNotes.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">Return notes</h2>
          <ul className="mt-2 space-y-1">
            {data.returnNotes.map((note) => (
              <li key={note.id}>
                {note.number} · {RETURN_NOTE_TYPE_LABELS[note.type]} · {boxesText(note.boxes)} (
                {note.reason}) ·{' '}
                {note.state === 'OPEN' ? `due ${formatDate(note.dueAt)}` : 'closed'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
}
