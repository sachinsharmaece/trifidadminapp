import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import type { IntegrityRun } from '@/features/system/api';
import { useIntegrity, useRunIntegrity } from '@/features/system/hooks';
import { formatDateTime } from '@/utils/format';

const CHECK_LABELS: Record<string, string> = {
  ORPHAN_REFERENCE: 'A record points at one that is gone',
  TOTAL_MISMATCH: 'A total does not add up',
  TRIAL_BALANCE: 'The trial balance',
  VOUCHER_SOURCE: 'A voucher and its document',
};

const STATUS_BADGE = {
  OK: { tone: 'success', text: 'No findings' },
  FINDINGS: { tone: 'danger', text: 'Findings' },
  FAILED: { tone: 'danger', text: 'The check failed to run' },
} as const;

function StatusBadge({ status }: { status: IntegrityRun['status'] }) {
  const { tone, text } = STATUS_BADGE[status];
  return <Badge tone={tone}>{text}</Badge>;
}

/**
 * The integrity check (Controller, Founder, Admin): once a night, and when you press the button, the server looks for
 * records that contradict each other. It only reads. The goal is zero findings: each one names the record to look at.
 */
export function IntegrityPage() {
  const integrity = useIntegrity();
  const run = useRunIntegrity();

  return (
    <PageLayout
      title="Integrity check"
      description="Looks for records that contradict each other: orphans, totals that do not add up, vouchers with no document. It runs every night and only reads."
      actions={
        <Button loading={run.isPending} onClick={() => run.mutate()}>
          Run the check now
        </Button>
      }
    >
      <ErrorAlert message={run.error?.message} />
      {integrity.isPending && (
        <Spinner label="Loading the last check" className="h-6 w-6 text-brand-600" />
      )}
      {integrity.isError && (
        <ErrorState title="Could not load this page" message={integrity.error.message}>
          <Button onClick={() => void integrity.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {integrity.isSuccess && !integrity.data.last && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          The check has not run yet. It runs every night after 2 am, or press the button.
        </p>
      )}
      {integrity.isSuccess && integrity.data.last && (
        <>
          <LastRun last={integrity.data.last} />
          {integrity.data.history.length > 0 && (
            <section aria-labelledby="integrity-history" className="space-y-2">
              <h2 id="integrity-history" className="text-lg font-semibold">
                Earlier checks
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
                {integrity.data.history.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                    <span className="w-32">{formatDateTime(item.startedAt)}</span>
                    <StatusBadge status={item.status} />
                    <span className="text-slate-600">
                      {item.findingCount} finding{item.findingCount === 1 ? '' : 's'} ·{' '}
                      {item.trigger === 'SCHEDULE' ? 'nightly' : 'run by hand'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageLayout>
  );
}

function LastRun({ last }: { last: IntegrityRun }) {
  const { checked } = last;
  return (
    <section aria-labelledby="integrity-last" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="integrity-last" className="text-lg font-semibold">
          Last check
        </h2>
        <StatusBadge status={last.status} />
        <span className="text-sm text-slate-600">
          {formatDateTime(last.startedAt)} ·{' '}
          {last.trigger === 'SCHEDULE' ? 'nightly' : 'run by hand'}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        Looked at {checked.salesOrders} sales orders, {checked.purchaseOrders} purchase orders,{' '}
        {checked.receipts} receipts and {checked.vouchers} vouchers.
      </p>
      {last.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          The check could not finish: {last.error}
        </p>
      )}
      {last.status === 'OK' && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Everything agrees. Nothing to fix.
        </p>
      )}
      {last.findingCount > 0 && (
        <>
          <p className="text-sm font-medium text-red-700">
            {last.findingCount} finding{last.findingCount === 1 ? '' : 's'}
            {last.findingCount > last.findings.length &&
              `, the first ${last.findings.length} shown`}
            . The check never changes anything: look at the record and correct it.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table aria-label="Findings" className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">What is wrong</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {last.findings.map((finding, index) => (
                  <tr key={`${finding.ref}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{finding.ref}</td>
                    <td className="px-4 py-3">{finding.message}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {CHECK_LABELS[finding.check] ?? finding.check}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
