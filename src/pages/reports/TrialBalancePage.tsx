import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useDownload, useTrialBalance } from '@/features/reports/hooks';
import { formatRupees, todayInIndia } from '@/utils/format';

/**
 * The trial balance (SRS-ACC-08): every ledger's balance on a day, in a Debit and a Credit column. The two columns
 * must add up to the same total; if they do not, something is wrong in the books and the page says so.
 */
export function TrialBalancePage() {
  const [asOn, setAsOn] = useState(todayInIndia);
  const report = useTrialBalance(asOn);
  const download = useDownload();

  return (
    <PageLayout
      title="Trial balance"
      description="The balance of every ledger on one day. The Debit and Credit totals must be equal."
      actions={
        <Button
          variant="secondary"
          loading={download.isPending}
          onClick={() =>
            download.mutate({
              path: '/reports/trial-balance',
              params: { asOn, format: 'csv' },
              fallbackName: 'trial-balance.csv',
            })
          }
        >
          Download CSV
        </Button>
      }
    >
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-500">As on</span>
        <Input
          type="date"
          value={asOn}
          max={todayInIndia()}
          onChange={(event) => setAsOn(event.target.value)}
          className="w-40"
        />
      </label>
      <ErrorAlert message={download.error?.message} />

      {report.isPending && (
        <Spinner label="Loading the trial balance" className="h-6 w-6 text-brand-600" />
      )}
      {report.isError && (
        <ErrorState title="Could not load the trial balance" message={report.error.message}>
          <Button onClick={() => void report.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {report.isSuccess && (
        <>
          <p>
            {report.data.balanced ? (
              <Badge tone="success">Balanced</Badge>
            ) : (
              <Badge tone="danger">Does not balance: tell the Controller</Badge>
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table aria-label="Trial balance" className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ledger</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 text-right font-medium">Debit</th>
                  <th className="px-4 py-3 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No balances on this day.
                    </td>
                  </tr>
                )}
                {report.data.rows.map((row) => (
                  <tr key={row.ledgerId}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.group}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {row.debitPaise > 0 ? formatRupees(row.debitPaise) : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {row.creditPaise > 0 ? formatRupees(row.creditPaise) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
                <tr>
                  <td colSpan={2} className="px-4 py-3">
                    Total
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(report.data.totals.debitPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(report.data.totals.creditPaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </PageLayout>
  );
}
