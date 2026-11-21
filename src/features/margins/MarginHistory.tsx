import { Badge } from '@/components/atoms/Badge';
import { CELL_STATUS_LABELS, type CellStatus } from '@/types/margin';
import { RATE_TIER_LABELS } from '@/types/party';
import { formatDate, formatPercent } from '@/utils/format';
import type { MarginCell } from './api';

const STATUS_TONES: Record<CellStatus, 'success' | 'info' | 'neutral'> = {
  CURRENT: 'success',
  SCHEDULED: 'info',
  PAST: 'neutral',
};

/** Every change ever made, newest first. Lines are never edited or deleted, so this is the full history. */
export function MarginHistory({ cells }: { cells: readonly MarginCell[] }) {
  const newestFirst = [...cells].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Class</th>
            <th className="px-4 py-3 font-medium">Tier</th>
            <th className="px-4 py-3 font-medium">Margin</th>
            <th className="px-4 py-3 font-medium">Starts</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Set by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {newestFirst.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No margins have been set yet.
              </td>
            </tr>
          )}
          {newestFirst.map((cell) => (
            <tr key={cell.id} className={cell.status === 'PAST' ? 'text-slate-500' : ''}>
              <td className="px-4 py-3">{cell.skuClass}</td>
              <td className="px-4 py-3">{RATE_TIER_LABELS[cell.buyerTier]}</td>
              <td className="px-4 py-3 font-medium">{formatPercent(cell.marginBp)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(cell.effectiveFrom)}</td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONES[cell.status]}>{CELL_STATUS_LABELS[cell.status]}</Badge>
              </td>
              <td className="px-4 py-3">
                <div>{cell.createdBy?.name ?? 'Unknown'}</div>
                <div className="text-xs text-slate-500">{formatDate(cell.createdAt)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
