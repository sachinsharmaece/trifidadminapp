import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { PaymentRow } from '@/features/payments/api';
import { AdvancesTab } from '@/features/payments/AdvancesTab';
import { HandPaymentForm } from '@/features/payments/HandPaymentForm';
import { useConfirmPayment, usePayments, useRejectPayment } from '@/features/payments/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_TONES, type ReceiptStatus } from '@/types/books';
import { formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;

/** What the list shows: one status, or the confirmed payments that still have money left to use (advances). */
type View = ReceiptStatus | 'UNUSED';
const VIEWS: View[] = ['LOGGED', 'POSTED', 'UNUSED', 'REJECTED', 'REVERSED'];
const VIEW_LABELS: Record<View, string> = {
  ...RECEIPT_STATUS_LABELS,
  UNUSED: 'Advances not yet used',
};

/** "Not received" needs a note: a small inline form under the row. */
function RejectRow({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
  const reject = useRejectPayment();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  return (
    <tr>
      <td colSpan={7} className="bg-slate-50 px-4 py-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return setError('Say what was wrong');
            setError(undefined);
            reject.mutate({ row, note: note.trim() }, { onSuccess: onClose });
          }}
        >
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
            <span>Why is {row.number} not received?</span>
            <Input
              aria-label={`Why is ${row.number} not received`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </label>
          <Button type="submit" size="sm" variant="danger" loading={reject.isPending}>
            Mark not received
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {(error ?? reject.error?.message) && (
            <p role="alert" className="w-full text-sm text-red-700">
              {error ?? reject.error?.message}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}

/**
 * The Accounts desk queue (one trade engine: these buttons press the same actions as the deal card).
 * Accounts finds each payment in the bank statement, then confirms it (posted to the books; the PO goes out
 * when the order is paid in full) or marks it not received. Nobody confirms a payment they entered themselves.
 *
 * Build 9: Accounts may add money that came with no order ("Add a payment"). It is confirmed by a different
 * person and then waits as the buyer's advance; the "Advances" tab spends it on an order.
 */
export function PaymentsPage() {
  const [tab, setTab] = useState<'PAYMENTS' | 'ADVANCES'>('PAYMENTS');
  const [view, setView] = useState<View>('LOGGED');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const q = useDebouncedValue(search.trim());
  const payments = usePayments({
    status: view === 'UNUSED' ? 'POSTED' : view,
    q,
    page,
    pageSize: PAGE_SIZE,
    ...(view === 'UNUSED' ? { unused: true as const } : {}),
  });
  const confirm = useConfirmPayment();
  // The Controller only looks (Q-ROL-01); Accounts, Founder and Admin may press.
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';

  return (
    <PageLayout
      title="Payments to confirm"
      description="Payments Sales entered, and money added by hand that came with no order. Find each in the bank statement, then confirm it or mark it not received."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Payments view">
          <Button
            variant={tab === 'PAYMENTS' ? 'primary' : 'secondary'}
            aria-pressed={tab === 'PAYMENTS'}
            onClick={() => setTab('PAYMENTS')}
          >
            Payments
          </Button>
          <Button
            variant={tab === 'ADVANCES' ? 'primary' : 'secondary'}
            aria-pressed={tab === 'ADVANCES'}
            onClick={() => setTab('ADVANCES')}
          >
            Advances to use
          </Button>
        </div>
        {canAct && tab === 'PAYMENTS' && !adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add a payment
          </Button>
        )}
      </div>

      {tab === 'ADVANCES' ? (
        <AdvancesTab canAct={canAct} />
      ) : (
        <>
          {adding && <HandPaymentForm onDone={() => setAdding(false)} />}
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(text) => {
              setSearch(text);
              setPage(1);
            }}
            searchPlaceholder="Search by payment no., UTR or buyer"
            searchLabel="Search payments"
          >
            <Select
              aria-label="Show"
              value={view}
              onChange={(event) => {
                setView(event.target.value as View);
                setPage(1);
              }}
            >
              {VIEWS.map((value) => (
                <option key={value} value={value}>
                  {VIEW_LABELS[value]}
                </option>
              ))}
            </Select>
          </DataTableToolbar>

          <ErrorAlert message={confirm.error?.message} />
          {payments.isPending && (
            <Spinner label="Loading payments" className="h-6 w-6 text-brand-600" />
          )}
          {payments.isError && (
            <ErrorState title="Could not load the payments" message={payments.error.message}>
              <Button onClick={() => void payments.refetch()}>Try again</Button>
            </ErrorState>
          )}
          {payments.isSuccess && (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[56rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">UTR · bank · date</th>
                      <th className="px-4 py-3 font-medium">Buyer</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Entered by</th>
                      <th className="px-4 py-3 font-medium">
                        {view === 'LOGGED' ? 'Action' : 'Result'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.data.payments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          {view === 'LOGGED' ? 'Nothing waits for Accounts.' : 'No payments here.'}
                        </td>
                      </tr>
                    )}
                    {payments.data.payments.map((row) => (
                      <PaymentRowView
                        key={row.id}
                        row={row}
                        canAct={canAct}
                        rejecting={rejecting === row.id}
                        onReject={() => setRejecting(row.id)}
                        onCloseReject={() => setRejecting(null)}
                        onConfirm={() => confirm.mutate(row)}
                        confirming={confirm.isPending && confirm.variables.id === row.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={payments.data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </PageLayout>
  );
}

function PaymentRowView(props: {
  row: PaymentRow;
  canAct: boolean;
  rejecting: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onCloseReject: () => void;
}) {
  const { row } = props;
  const byHand = row.source === 'HAND_ADDED';
  return (
    <>
      <tr>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="font-medium">{row.number}</span>
          {byHand && (
            <Badge tone="info" className="ml-2">
              Added by hand
            </Badge>
          )}
          <div className="text-xs text-slate-500">{formatDateTime(row.enteredAt)}</div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
          {formatRupees(row.amountPaise)}
        </td>
        <td className="px-4 py-3">
          {row.utr}
          <div className="text-xs text-slate-500">
            {row.bankName} · {row.receivedOn}
          </div>
          {row.note && <div className="text-xs text-slate-500">{row.note}</div>}
        </td>
        <td className="px-4 py-3">
          {row.buyer.number} · {row.buyer.firmName}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          {row.salesOrder ? (
            <>
              <Link
                to={`/sales-orders/${row.salesOrder.id}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {row.salesOrder.number}
              </Link>
              <div className="text-xs text-slate-500">
                due {formatRupees(row.salesOrder.totalPaise - row.salesOrder.paidPaise)}
              </div>
            </>
          ) : (
            <>
              <span className="text-slate-700">No order: an advance</span>
              {row.status === 'POSTED' && (
                <div className="text-xs text-slate-500">
                  {row.unspentPaise > 0
                    ? `${formatRupees(row.unspentPaise)} not used yet`
                    : 'all used on orders'}
                </div>
              )}
            </>
          )}
        </td>
        <td className="px-4 py-3">{row.enteredBy}</td>
        <td className="whitespace-nowrap px-4 py-3">
          {row.status === 'LOGGED' ? (
            !props.canAct ? (
              <span className="text-xs text-slate-500">Waiting for Accounts</span>
            ) : row.enteredByMe ? (
              <span className="text-xs text-slate-500">You entered it: someone else confirms</span>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" loading={props.confirming} onClick={props.onConfirm}>
                  Confirm
                </Button>
                <Button size="sm" variant="secondary" onClick={props.onReject}>
                  Not received
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1">
              <Badge tone={RECEIPT_STATUS_TONES[row.status]}>
                {RECEIPT_STATUS_LABELS[row.status]}
              </Badge>
              <span className="text-xs text-slate-500">
                {row.voucherNumber ?? row.rejectNote ?? ''}
              </span>
            </div>
          )}
        </td>
      </tr>
      {props.rejecting && <RejectRow row={row} onClose={props.onCloseReject} />}
    </>
  );
}
