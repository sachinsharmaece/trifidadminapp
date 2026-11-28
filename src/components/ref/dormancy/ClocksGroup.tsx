import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { refSend } from '@/lib/refApi';
import {
  RELEASE_REASONS,
  daysAgoIST,
  formatWindowStatus,
  getOrError,
  type HoldingRow,
  type HoldingsResponse,
  type UncalledCount,
} from './dormancyTypes';

/**
 * Today → Clocks (reference components/dormancy/ClocksGroup, LOCK-34 §8): new leads not called yet, claimed or
 * assigned parties not called yet, open reason windows (with the reason picker, one tap) and "Uncalled N / cap".
 * Shows nothing when the policy is off or the person is not a caller.
 */
export function ClocksGroup() {
  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [uncalled, setUncalled] = useState<UncalledCount | null>(null);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await getOrError<HoldingsResponse>('/dormancy/holdings');
    if ('error' in res) return;
    setRows(res.data.holdings ?? []);
    setUncalled(res.data.uncalled ?? null);
  }
  useOnMount(load);

  async function submitReason(holdingId: string) {
    const reason = reasonDraft[holdingId];
    if (!reason) return;
    setError(null);
    const res = await refSend('POST', '/dormancy/reason', { holdingId, reason });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  const newLeadsNotCalled = rows.filter(
    (h) => h.via === 'INTAKE' && h.uncalled && !h.windowOpenedAt,
  );
  const claimedNotCalled = rows.filter(
    (h) => (h.via === 'POOL_CLAIM' || h.via === 'DESK_ASSIGN') && h.uncalled && !h.windowOpenedAt,
  );
  const openWindows = rows.filter((h) => h.windowOpenedAt !== null);
  if (
    newLeadsNotCalled.length === 0 &&
    claimedNotCalled.length === 0 &&
    openWindows.length === 0 &&
    !uncalled
  ) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Clocks</h2>
        {uncalled && (
          <span className="text-xs text-zinc-600">
            Uncalled {uncalled.count} / {uncalled.cap}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {newLeadsNotCalled.map((h) => {
        const status = h.firstCallDueAt ? formatWindowStatus(new Date(h.firstCallDueAt)) : null;
        return (
          <div key={h.id} className="flex items-center justify-between text-sm">
            <Link to={`/buyers/${h.partyId}`} className="text-zinc-900">
              {h.partyName}
            </Link>
            {status && (
              <span className={status.overdue ? 'text-red-600' : 'text-amber-600'}>
                {status.label}
              </span>
            )}
          </div>
        );
      })}
      {claimedNotCalled.map((h) => (
        <div key={h.id} className="flex items-center justify-between text-sm">
          <Link to={`/buyers/${h.partyId}`} className="text-zinc-900">
            {h.partyName}
          </Link>
          <span className="text-amber-600">
            {h.via === 'POOL_CLAIM' ? 'Claimed' : 'Assigned'} {daysAgoIST(h.startedAt)} days ago,
            not called
          </span>
        </div>
      ))}
      {openWindows.map((h) => (
        <div key={h.id} className="flex flex-col gap-1 border-t border-zinc-100 pt-2 text-sm">
          <div className="flex items-center justify-between">
            <Link to={`/buyers/${h.partyId}`} className="text-zinc-900">
              {h.partyName}
            </Link>
            <span className="text-red-600">Releasing in {h.releasingInDays} days</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label={`Why did ${h.partyName} go?`}
              value={reasonDraft[h.id] ?? ''}
              onChange={(e) => setReasonDraft((d) => ({ ...d, [h.id]: e.target.value }))}
              className="min-h-11 flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
            >
              <option value="">Why did he go?</option>
              {RELEASE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void submitReason(h.id)}
              disabled={!reasonDraft[h.id]}
              className="min-h-11 rounded bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
