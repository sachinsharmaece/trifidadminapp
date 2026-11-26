import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { BillingRow } from '@/features/billing/api';
import { useRecordMargBill, useToBeBilled } from '@/features/billing/hooks';
import { MargBillForm } from '@/features/billing/MargBillForm';
import { isChangedByOthers } from '@/features/trades/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { boxesText, formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;
const CHANGED =
  'Someone else acted on this order first, so your bill was not saved. The list now shows the latest.';

/** One order: the buyer, what the dock accepted at his rate, refunds due, and the Marg bill (or its button). */
function BillingCard({ row, canAct }: { row: BillingRow; canAct: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const save = useRecordMargBill();
  const accepted = row.accepted;
  const bill = row.margBill;

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{row.number}</span>
        <span className="text-slate-600">
          {row.buyer.firmName} ({row.buyer.number}) · {row.interState ? 'IGST' : 'CGST + SGST'}
        </span>
        {bill && <Badge tone="info">Billed</Badge>}
      </div>
      {accepted && (
        <ul className="space-y-1">
          {accepted.lines.map((line) => (
            <li key={line.lineNo}>
              {line.productName} · {line.packLabel}: {boxesText(line.acceptedBoxes)} accepted of{' '}
              {line.orderedBoxes} · {formatRupees(line.buyerRatePaisePerUnit)} per unit ×{' '}
              {line.unitsPerBox}
            </li>
          ))}
          <li className="font-medium">
            At most {formatRupees(accepted.expectedPaise)} to bill
            {accepted.inspectedAt ? ` · checked ${formatDateTime(accepted.inspectedAt)}` : ''}
          </li>
        </ul>
      )}
      {row.refundsDuePaise > 0 && (
        <p className="text-amber-700">
          Refund due to the buyer: {formatRupees(row.refundsDuePaise)}
        </p>
      )}
      {bill && (
        <p className="rounded-md bg-slate-50 px-3 py-2">
          Marg {bill.invoiceNumber} · {formatRupees(bill.totalPaise)} · {bill.billDate}
          {bill.ewayBillNumber ? ` · e-way ${bill.ewayBillNumber}` : ''}
          {bill.shortByPaise > 0 ? ` · ${formatRupees(bill.shortByPaise)} lower than accepted` : ''}
        </p>
      )}
      <ErrorAlert message={notice} />
      {!bill && canAct && !open && accepted && (
        <Button size="sm" onClick={() => setOpen(true)}>
          Enter Marg bill
        </Button>
      )}
      {!bill && !canAct && <p className="text-xs text-slate-500">Accounts does this.</p>}
      {open && accepted && (
        <MargBillForm
          accepted={accepted}
          pending={save.isPending}
          error={save.error?.message}
          onSave={(input) =>
            save.mutateAsync({ row, bill: input }).then(
              () => setOpen(false),
              (error: unknown) => {
                if (isChangedByOthers(error)) {
                  setOpen(false);
                  setNotice(CHANGED);
                }
                throw error;
              },
            )
          }
          onCancel={() => setOpen(false)}
        />
      )}
    </li>
  );
}

/**
 * To be billed (the Accounts desk queue; FR-ACC-04): orders the dock has checked, waiting for their Marg invoice,
 * oldest check first. "Enter Marg bill" presses the same engine action as the deal card. Billed: the ones done.
 */
export function ToBeBilledPage() {
  const [state, setState] = useState<'TO_BILL' | 'BILLED'>('TO_BILL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const list = useToBeBilled({ state, q, page, pageSize: PAGE_SIZE });
  // The Controller only looks (Q-ROL-01); Accounts, Founder and Admin may press.
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';

  return (
    <PageLayout
      title="To be billed"
      description="Orders checked at the dock: key each Marg invoice. It may not be higher than the accepted boxes at the buyer's rate."
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Order, buyer or Marg number"
        searchLabel="Search orders to bill"
      >
        <Select
          aria-label="Show"
          value={state}
          onChange={(event) => {
            setState(event.target.value as 'TO_BILL' | 'BILLED');
            setPage(1);
          }}
        >
          <option value="TO_BILL">To be billed</option>
          <option value="BILLED">Billed</option>
        </Select>
      </DataTableToolbar>
      {list.isPending && (
        <Spinner label="Loading orders to bill" className="h-6 w-6 text-brand-600" />
      )}
      {list.isError && (
        <ErrorState title="Could not load the orders" message={list.error.message}>
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {list.isSuccess && (
        <>
          {list.data.rows.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {state === 'TO_BILL' ? 'Nothing waiting for a Marg bill.' : 'Nothing billed yet.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {list.data.rows.map((row) => (
                <BillingCard key={`${row.salesOrderId}-${row.status}`} row={row} canAct={canAct} />
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
