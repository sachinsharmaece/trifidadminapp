import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getMyHoldings, logReason, type MyHoldingRow, type ReleaseReason } from '../../api/holding';
import { ApiError } from '../../api/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { timeAgo, useMinuteClock } from '../../lib/timeAgo';
import { useHoldingStatus } from '../../lib/useHoldingStatus';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Select } from '../ui/Input';
import { useOptionalToast } from '../ui/Toast';
import { KIND_LABEL, REASONS, REASON_LABEL, callDueText, releasingText } from './holdingFormat';

/**
 * LOCK-34 — Today → Clocks. What is on the clock for the signed-in person: new
 * leads not yet called (with the time the first call is due), claimed or
 * desk-assigned parties not yet called, and parties whose reason window is open
 * (pick the reason here, in one tap). Shows nothing while the policy is off.
 */
export function ClocksGroup() {
  const status = useHoldingStatus();
  if (!status.enabled || !(status.isCaller || status.isTeamLeader)) return null;
  return <Clocks />;
}

function Clocks() {
  const { callApi } = useAuth();
  const toast = useOptionalToast();
  const now = useMinuteClock();
  const [data, setData] = useState<{ items: MyHoldingRow[]; uncalled: number; cap: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await callApi((token) => getMyHoldings(token)));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your clocks.');
    }
  }, [callApi]);
  useEffect(() => {
    void load();
  }, [load]);

  async function chooseReason(row: MyHoldingRow, reason: ReleaseReason): Promise<void> {
    try {
      await callApi((token) => logReason(token, row.holdingId, reason, newIdempotencyKey()));
      toast?.show(`Reason saved for ${row.firm}.`);
      await load();
    } catch (e) {
      toast?.show(e instanceof ApiError ? e.message : 'Could not save the reason.');
    }
  }

  if (error)
    return (
      <Card title="Clocks">
        <p className="text-sm text-danger-500">{error}</p>
      </Card>
    );
  if (!data) return null;

  const uncalled = data.items.filter((i) => i.uncalled);
  const windows = data.items.filter((i) => i.windowOpenedAt && i.releasesAt);
  const full = data.uncalled >= data.cap;

  return (
    <Card
      title="Clocks"
      actions={
        <Badge tone={full ? 'bad' : 'neutral'}>
          Uncalled {data.uncalled} / {data.cap}
        </Badge>
      }
    >
      {uncalled.length === 0 && windows.length === 0 && (
        <p className="text-sm text-slate-500">Nothing is on the clock.</p>
      )}

      {uncalled.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Call these</h3>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {uncalled.map((row) => {
              const due = row.callDueAt ? callDueText(row.callDueAt, now) : null;
              return (
                <li
                  key={row.holdingId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
                >
                  <Link
                    to={`/sales/call/${row.buyerId}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {row.firm}
                  </Link>
                  <Badge tone="neutral" variant="chip">
                    {KIND_LABEL[row.kind]}
                  </Badge>
                  <span
                    className={`text-sm ${due?.overdue ? 'font-semibold text-danger-500' : 'text-slate-600'}`}
                  >
                    {due ? due.text : `Claimed ${timeAgo(row.startedAt, now)}, not called`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {windows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Why is he lapsing?</h3>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {windows.map((row) => (
              <li
                key={row.holdingId}
                className="flex flex-wrap items-end gap-x-4 gap-y-2 px-3 py-2"
              >
                <div className="min-w-48">
                  <Link
                    to={`/sales/call/${row.buyerId}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {row.firm}
                  </Link>
                  <div className="text-sm text-warning-600">
                    {releasingText(row.releasesAt!, now)}
                  </div>
                </div>
                <div className="w-64">
                  <Select
                    label="Reason"
                    value={row.reason ?? ''}
                    onChange={(e) => void chooseReason(row, e.target.value as ReleaseReason)}
                  >
                    <option value="" disabled>
                      Pick a reason
                    </option>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REASON_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
