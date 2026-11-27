import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Reconciliation } from '@/features/reconciliation/api';
import { useMarkReconciled, useReconciliations } from '@/features/reconciliation/hooks';
import { ReconcileForm } from '@/features/reconciliation/ReconcileForm';
import { formatRupees } from '@/utils/format';

/** A signed amount in rupees: a minus sign when the account is overdrawn. */
const signedRupees = (paise: number) =>
  paise < 0 ? `−${formatRupees(-paise)}` : formatRupees(paise);

/**
 * Bank reconciliation (Build 9). Accounts types the closing balance from the bank's statement for a day; the screen
 * shows what the books say and the difference. Only a difference of zero can be marked reconciled, and then that
 * day is locked for that bank account (nothing can be dated on or before it). There is no "un-reconcile": a mistake
 * found later is fixed with an entry dated after it.
 */
export function BankReconciliationPage() {
  const data = useReconciliations();
  const mark = useMarkReconciled();
  const [checking, setChecking] = useState<string | null | false>(false);
  // The Controller only looks; Accounts, Founder and Admin may check and mark.
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';

  return (
    <PageLayout
      title="Bank reconciliation"
      description="Check each bank account against its statement. A day that matches can be marked reconciled, and it is then locked."
    >
      {data.isPending && <Spinner label="Loading banks" className="h-6 w-6 text-brand-600" />}
      {data.isError && (
        <ErrorState title="Could not load the bank accounts" message={data.error.message}>
          <Button onClick={() => void data.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {data.isSuccess && (
        <>
          {checking !== false && (
            <ReconcileForm
              banks={data.data.banks}
              {...(checking ? { initialBankId: checking } : {})}
              onDone={() => setChecking(false)}
            />
          )}
          <ErrorAlert message={mark.error?.message} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Bank account</th>
                  <th className="px-4 py-3 font-medium">Reconciled up to</th>
                  <th className="px-4 py-3 text-right font-medium">Entries since</th>
                  <th className="px-4 py-3 text-right font-medium">Books say</th>
                  {canAct && <th className="px-4 py-3 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.banks.length === 0 && (
                  <tr>
                    <td colSpan={canAct ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                      No bank accounts yet. Add one under Bank accounts.
                    </td>
                  </tr>
                )}
                {data.data.banks.map((bank) => (
                  <tr key={bank.bankLedgerId}>
                    <td className="px-4 py-3 font-medium">{bank.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {bank.lastReconciledOn ?? <span className="text-slate-500">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{bank.entriesSince}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {signedRupees(bank.booksPaise)}
                    </td>
                    {canAct && (
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setChecking(bank.bankLedgerId)}
                        >
                          Check against statement
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-base font-semibold text-slate-900">Checks so far</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Bank account</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Statement</th>
                  <th className="px-4 py-3 text-right font-medium">Books</th>
                  <th className="px-4 py-3 text-right font-medium">Difference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nothing checked yet.
                    </td>
                  </tr>
                )}
                {data.data.history.map((row) => (
                  <HistoryRow
                    key={row.id}
                    row={row}
                    canAct={canAct}
                    marking={mark.isPending && mark.variables.id === row.id}
                    onMark={() => mark.mutate(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageLayout>
  );
}

function HistoryRow(props: {
  row: Reconciliation;
  canAct: boolean;
  marking: boolean;
  onMark: () => void;
}) {
  const { row } = props;
  return (
    <tr>
      <td className="px-4 py-3 font-medium">{row.bankName}</td>
      <td className="whitespace-nowrap px-4 py-3">{row.date}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {signedRupees(row.statementClosingPaise)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {signedRupees(row.ledgerClosingPaise)}
      </td>
      <td
        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${row.differencePaise === 0 ? '' : 'text-red-700'}`}
      >
        {signedRupees(row.differencePaise)}
      </td>
      <td className="px-4 py-3">
        {row.status === 'RECONCILED' ? (
          <div className="flex flex-col gap-1">
            <Badge tone="success">Reconciled</Badge>
            <span className="text-xs text-slate-500">{row.reconciledBy}</span>
          </div>
        ) : row.differencePaise === 0 && props.canAct ? (
          <Button size="sm" loading={props.marking} onClick={props.onMark}>
            Mark reconciled
          </Button>
        ) : (
          <div className="flex flex-col gap-1">
            <Badge tone="warning">Does not match</Badge>
            <span className="text-xs text-slate-500">Find the difference, then check again</span>
          </div>
        )}
      </td>
    </tr>
  );
}
