import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { BalanceText } from '@/features/ledgers/BalanceText';
import { useLedgers } from '@/features/ledgers/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatRupees } from '@/utils/format';

/**
 * Every ledger in the books with its balance (debits − credits of its voucher lines). A bank account's balance
 * Dr = money in our bank; a buyer's balance Cr = money he has paid us ahead of his bill.
 */
export function LedgersPage() {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim());
  const ledgers = useLedgers(q);

  return (
    <PageLayout
      title="Ledgers"
      description="Each buyer, seller and bank account has a ledger. Open one to see its statement."
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ledgers"
        searchLabel="Search ledgers"
      />
      {ledgers.isPending && <Spinner label="Loading ledgers" className="h-6 w-6 text-brand-600" />}
      {ledgers.isError && (
        <ErrorState title="Could not load the ledgers" message={ledgers.error.message}>
          <Button onClick={() => void ledgers.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {ledgers.isSuccess && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ledger</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 text-right font-medium">Debits</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgers.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No ledgers yet: they appear when bank accounts are added and money moves.
                  </td>
                </tr>
              )}
              {ledgers.data.map((ledger) => (
                <tr key={ledger.id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/ledgers/${ledger.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {ledger.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ledger.group}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(ledger.drPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(ledger.crPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <BalanceText balance={ledger.balance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
