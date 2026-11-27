import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import type { LedgerRow } from '@/features/ledgers/api';
import { BalanceText } from '@/features/ledgers/BalanceText';
import { useLedgers, useUpdateLedger } from '@/features/ledgers/hooks';
import { AddLedgerForm, RenameLedgerForm } from '@/features/ledgers/LedgerForm';
import { useCurrentUser } from '@/features/auth/hooks';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { Badge } from '@/components/atoms/Badge';
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
  const update = useUpdateLedger();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<LedgerRow | null>(null);
  // Accounts, Founder and Admin keep the ledger master; the Controller only looks.
  const { data: me } = useCurrentUser();
  const canEdit = me?.role === 'ACCOUNTS' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  return (
    <PageLayout
      title="Ledgers"
      description="Each buyer, seller and bank account has a ledger, and Accounts adds the others the books need. Open one to see its statement."
    >
      {canEdit && !adding && !renaming && (
        <div>
          <Button onClick={() => setAdding(true)}>Add a ledger</Button>
        </div>
      )}
      {adding && <AddLedgerForm onDone={() => setAdding(false)} />}
      {renaming && <RenameLedgerForm ledger={renaming} onDone={() => setRenaming(null)} />}
      <ErrorAlert message={update.error?.message} />
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
                {canEdit && <th className="px-4 py-3 font-medium">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgers.data.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
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
                    {!ledger.active && (
                      <Badge tone="neutral" className="ml-2">
                        Turned off
                      </Badge>
                    )}
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
                  {canEdit && (
                    <td className="whitespace-nowrap px-4 py-3">
                      {ledger.hand ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setRenaming(ledger)}>
                            Rename
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={update.isPending && update.variables.ledger.id === ledger.id}
                            onClick={() => update.mutate({ ledger, active: !ledger.active })}
                          >
                            {ledger.active ? 'Turn off' : 'Turn on'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Kept by the system</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
