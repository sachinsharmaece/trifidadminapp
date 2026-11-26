import { useState } from 'react';
import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { BankAccount } from '@/features/bankAccounts/api';
import { BankAccountForm } from '@/features/bankAccounts/BankAccountForm';
import { useBankAccounts, useUpdateBankAccount } from '@/features/bankAccounts/hooks';
import { BANK_KIND_LABELS } from '@/types/books';
import { maskedAccount } from '@/utils/format';

/**
 * Our bank accounts. Each is a ledger in the books (under Bank Accounts): its statement is the bank book.
 * Accounts and supervisors look; Founder and Admin add, edit and turn them off (never delete).
 */
export function BankAccountsPage() {
  const accounts = useBankAccounts();
  const canEdit = useCanEditMasters();
  const toggle = useUpdateBankAccount();
  const [editing, setEditing] = useState<BankAccount | 'new' | null>(null);

  return (
    <PageLayout
      title="Bank accounts"
      description="Where buyers pay us. Sales picks one when entering a payment; a turned-off account takes no new payments."
      actions={
        canEdit &&
        editing === null && <Button onClick={() => setEditing('new')}>Add bank account</Button>
      }
    >
      {editing !== null && (
        <BankAccountForm
          key={editing === 'new' ? 'new' : editing.id}
          account={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
      <ErrorAlert message={toggle.error?.message} />
      {accounts.isPending && (
        <Spinner label="Loading accounts" className="h-6 w-6 text-brand-600" />
      )}
      {accounts.isError && (
        <ErrorState title="Could not load the bank accounts" message={accounts.error.message}>
          <Button onClick={() => void accounts.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {accounts.isSuccess && (
        // "relative" keeps the hidden "Actions" header inside this scroll box on narrow screens.
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Bank</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canEdit && <th className="px-4 py-3 font-medium sr-only">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No bank accounts yet.
                  </td>
                </tr>
              )}
              {accounts.data.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-medium">{account.name}</td>
                  <td className="px-4 py-3">
                    {account.bankName}
                    <div className="text-xs text-slate-500">{account.ifsc}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {maskedAccount(account.accountLast4)}
                  </td>
                  <td className="px-4 py-3">{BANK_KIND_LABELS[account.kind]}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={account.active} />
                  </td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(account)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggle.mutate({ account, changes: { active: !account.active } })
                        }
                      >
                        {account.active ? 'Turn off' : 'Turn on'}
                      </Button>
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
