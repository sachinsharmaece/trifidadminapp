import { Link, useParams } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useStatement } from '@/features/ledgers/hooks';
import { formatRupees } from '@/utils/format';
import { BalanceText } from '@/features/ledgers/BalanceText';

/** One ledger's statement: its voucher lines, oldest first, with the running balance. A bank's is its bank book. */
export function LedgerPage() {
  const { id = '' } = useParams();
  const statement = useStatement(id);

  if (statement.isPending) {
    return <Spinner label="Loading statement" className="h-6 w-6 text-brand-600" />;
  }
  if (statement.isError) {
    return (
      <ErrorState title="Could not load this ledger" message={statement.error.message}>
        <Button onClick={() => void statement.refetch()}>Try again</Button>
        <Link to="/ledgers" className="text-sm font-medium text-brand-700 hover:underline">
          Back to ledgers
        </Link>
      </ErrorState>
    );
  }
  const { ledger, lines, totals } = statement.data;
  return (
    <PageLayout
      title={ledger.name}
      description={`${ledger.group}${ledger.kind === 'BANK' ? ' · this statement is the bank book' : ''}`}
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Voucher</th>
              <th className="px-4 py-3 font-medium">Narration</th>
              <th className="px-4 py-3 text-right font-medium">Debit</th>
              <th className="px-4 py-3 text-right font-medium">Credit</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No entries yet.
                </td>
              </tr>
            )}
            {lines.map((line) => (
              <tr key={`${line.voucherNumber}-${line.drPaise}-${line.crPaise}`}>
                <td className="whitespace-nowrap px-4 py-3">{line.date}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{line.voucherNumber}</td>
                <td className="px-4 py-3">{line.narration}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {line.drPaise ? formatRupees(line.drPaise) : ''}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {line.crPaise ? formatRupees(line.crPaise) : ''}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <BalanceText balance={line.balance} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right">
                Total
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {formatRupees(totals.drPaise)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {formatRupees(totals.crPaise)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <BalanceText balance={totals.balance} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </PageLayout>
  );
}
