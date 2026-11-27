import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { VoucherRow } from '@/features/vouchers/api';
import { useVoucher, useVouchers } from '@/features/vouchers/hooks';
import { ReverseForm } from '@/features/vouchers/ReverseForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { VOUCHER_TYPE_LABELS, VOUCHER_TYPES, type VoucherType } from '@/types/books';
import { formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;

/** The lines of one voucher (loaded when its row is opened). */
function LinesRow({ id }: { id: string }) {
  const voucher = useVoucher(id);
  return (
    <tr>
      <td colSpan={6} className="bg-slate-50 px-4 py-3">
        {voucher.isPending && <Spinner label="Loading lines" className="h-5 w-5 text-brand-600" />}
        {voucher.isError && <p className="text-sm text-red-700">{voucher.error.message}</p>}
        {voucher.isSuccess && (
          <table className="w-full max-w-xl text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 text-left font-medium">Ledger</th>
                <th className="py-1 text-right font-medium">Debit</th>
                <th className="py-1 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {voucher.data.lines.map((line, index) => (
                <tr key={index}>
                  <td className="py-1">{line.ledgerName}</td>
                  <td className="py-1 text-right">
                    {line.drPaise > 0 ? formatRupees(line.drPaise) : ''}
                  </td>
                  <td className="py-1 text-right">
                    {line.crPaise > 0 ? formatRupees(line.crPaise) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  );
}

/**
 * The vouchers in the books (Build 9). Controller, Founder, Admin and Accounts can read them. A voucher is never
 * edited: the Controller (or Founder / Admin) undoes a wrong hand entry or an unused hand-added payment with a
 * reversal. Everything else says in plain words why it cannot be reversed here.
 */
export function VouchersPage() {
  const [type, setType] = useState<VoucherType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [reversing, setReversing] = useState<VoucherRow | null>(null);
  const q = useDebouncedValue(search.trim());
  const vouchers = useVouchers({ type, from, to, q, page, pageSize: PAGE_SIZE });
  const { data: me } = useCurrentUser();
  // Only these three may reverse; Accounts reads.
  const mayReverse = me?.role === 'CONTROLLER' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  return (
    <PageLayout
      title="Vouchers"
      description="Every entry in the books. A voucher is never edited: a wrong one is undone by a reversal that mirrors it."
    >
      {reversing && <ReverseForm voucher={reversing} onDone={() => setReversing(null)} />}
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Search by voucher no. or narration"
        searchLabel="Search vouchers"
      >
        <Select
          aria-label="Type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as VoucherType | '');
            setPage(1);
          }}
        >
          <option value="">Every type</option>
          {VOUCHER_TYPES.map((value) => (
            <option key={value} value={value}>
              {VOUCHER_TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>
      <div className="flex flex-wrap gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-500">From date</span>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-500">To date</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {vouchers.isPending && (
        <Spinner label="Loading vouchers" className="h-6 w-6 text-brand-600" />
      )}
      {vouchers.isError && (
        <ErrorState title="Could not load the vouchers" message={vouchers.error.message}>
          <Button onClick={() => void vouchers.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {vouchers.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Voucher</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Narration</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">{mayReverse ? 'Action' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.data.vouchers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No vouchers here.
                    </td>
                  </tr>
                )}
                {vouchers.data.vouchers.map((voucher) => (
                  <VoucherRows
                    key={voucher.id}
                    voucher={voucher}
                    mayReverse={mayReverse}
                    isOpen={open === voucher.id}
                    onToggle={() => setOpen(open === voucher.id ? null : voucher.id)}
                    onReverse={() => setReversing(voucher)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={vouchers.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}

function VoucherRows(props: {
  voucher: VoucherRow;
  mayReverse: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onReverse: () => void;
}) {
  const { voucher } = props;
  return (
    <>
      <tr>
        <td className="whitespace-nowrap px-4 py-3">
          <button
            type="button"
            className="font-medium text-brand-700 hover:underline"
            aria-expanded={props.isOpen}
            onClick={props.onToggle}
          >
            {voucher.number}
          </button>
          <div className="text-xs text-slate-500">{VOUCHER_TYPE_LABELS[voucher.type]}</div>
        </td>
        <td className="whitespace-nowrap px-4 py-3">{voucher.date}</td>
        <td className="px-4 py-3">{voucher.narration}</td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
          {formatRupees(voucher.totalPaise)}
        </td>
        <td className="px-4 py-3">
          {voucher.source.number ?? voucher.source.type}
          <div className="text-xs text-slate-500">{voucher.postedBy ?? 'System'}</div>
        </td>
        <td className="px-4 py-3">
          {voucher.reversedBy ? (
            <Badge tone="neutral">Reversed by {voucher.reversedBy}</Badge>
          ) : voucher.canReverse && props.mayReverse ? (
            <Button size="sm" variant="secondary" onClick={props.onReverse}>
              Reverse
            </Button>
          ) : voucher.cannotReverseBecause ? (
            <span className="text-xs text-slate-500">{voucher.cannotReverseBecause}</span>
          ) : (
            <Badge tone="success">Posted</Badge>
          )}
        </td>
      </tr>
      {props.isOpen && <LinesRow id={voucher.id} />}
    </>
  );
}
