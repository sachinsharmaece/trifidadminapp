import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { formatDateIST } from '@/lib/refMoney';
import {
  formatWindowStatus,
  getOrError,
  type HoldingRow,
  type HoldingsResponse,
  type UncalledCount,
} from './dormancyTypes';

const KIND_LABEL: Record<HoldingRow['kind'], string> = {
  LEAD: 'Lead',
  CLAIM: 'Claimed',
  BOOK: 'Book',
};

/**
 * Buyers → "In the book" (reference components/dormancy/MyBookTab, LOCK-34 §8): everything the caller holds,
 * uncalled first, each with a kind badge and its clock.
 */
export function MyBookTab() {
  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [uncalled, setUncalled] = useState<UncalledCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useOnMount(async () => {
    const res = await getOrError<HoldingsResponse>('/dormancy/holdings');
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setRows(res.data.holdings ?? []);
    setUncalled(res.data.uncalled ?? null);
  });

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {uncalled && (
        <p className="text-sm text-zinc-600">
          Uncalled {uncalled.count} / {uncalled.cap}
        </p>
      )}
      {!error && rows.length === 0 && (
        <p className="text-sm text-zinc-400">Nothing in your book yet.</p>
      )}
      {rows.map((h) => (
        <div
          key={h.id}
          className="flex items-center justify-between gap-3 rounded border border-zinc-200 p-3"
        >
          <div>
            <Link to={`/buyers/${h.partyId}`} className="text-sm font-medium text-zinc-900">
              {h.partyName}
            </Link>
            <p className="text-xs text-zinc-500">
              {h.tehsil ? `${h.tehsil} — ` : ''}
              {h.district} · started {formatDateIST(h.startedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
              {KIND_LABEL[h.kind]}
            </span>
            {h.uncalled && h.firstCallDueAt && (
              <span className="text-amber-600">
                {formatWindowStatus(new Date(h.firstCallDueAt)).label}
              </span>
            )}
            {h.releasingInDays !== null && (
              <span className="text-red-600">Releasing in {h.releasingInDays} days</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
