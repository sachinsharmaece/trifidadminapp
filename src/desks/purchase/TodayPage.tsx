import { useCallback } from 'react';
import { FiFlag } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import {
  getActiveDemandList,
  getPilesAwaitingDecision,
  getDispatchChaseQueue,
  getInspectionsPendingApply,
  getReturnNoteAgeing,
  getFunnelReport,
  type PileAwaitingDecisionItem,
  type DispatchQueueItem,
  type InspectionPendingApplyItem,
  type ReturnNoteAgeingItem,
  type FunnelReport,
} from '../../api/purchase';
import { listRegistrations } from '../../api/onboarding';
import type { RegistrationListItem } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DevNote } from '../../components/dev/DevNote';
import { FunnelMetricsGrid } from './FunnelMetrics';

interface TodaySummary {
  noSellerAsks: number;
  pilesChasing: PileAwaitingDecisionItem[];
  dispatchOverdue: DispatchQueueItem[];
  inspectionsPending: InspectionPendingApplyItem[];
  returnNotesOld: ReturnNoteAgeingItem[];
  sellersPendingApproval: RegistrationListItem[];
  funnel: FunnelReport | null;
}

/**
 * CH §19.8-in-spirit — no unified backend worklist exists (an earlier session
 * deliberately did not build one, `API-100`; each desk keeps its own list).
 * This screen composes exactly those per-concern reads client-side, so
 * nothing new is invented on the server just to feed one page.
 */
export function TodayPage() {
  const { callApi, hasPermission } = useAuth();
  const navigate = useNavigate();

  const loader = useCallback(async (): Promise<TodaySummary> => {
    const [demand, piles, dispatch, inspections, returns, registrations, funnel] =
      await Promise.all([
        callApi((token) => getActiveDemandList(token, true)),
        callApi((token) => getPilesAwaitingDecision(token)),
        callApi((token) => getDispatchChaseQueue(token)),
        callApi((token) => getInspectionsPendingApply(token)),
        callApi((token) => getReturnNoteAgeing(token)),
        callApi((token) => listRegistrations(token, 'pending')),
        hasPermission(PERMISSIONS.FUNNEL_READ)
          ? callApi((token) => getFunnelReport(token))
          : Promise.resolve(null),
      ]);
    return {
      noSellerAsks: demand.length,
      pilesChasing: piles.filter((p) => p.chaseLeftHours <= 3),
      dispatchOverdue: dispatch.filter((d) => d.bucket === 'overdue'),
      inspectionsPending: inspections,
      returnNotesOld: returns.filter((r) => r.daysOld > 21),
      sellersPendingApproval: registrations.filter((r) => r.kind !== 'buyer'),
      funnel,
    };
  }, [callApi, hasPermission]);

  const { state, retry } = useAsyncData(
    loader,
    (s) =>
      s.noSellerAsks +
        s.pilesChasing.length +
        s.dispatchOverdue.length +
        s.inspectionsPending.length +
        s.returnNotesOld.length +
        s.sellersPendingApproval.length ===
      0,
    [loader],
  );

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_today" />
      <p className="text-sm text-slate-500">
        Everything waiting on this desk, in the order it will hurt.
      </p>
      <AsyncBoundary
        state={state}
        onRetry={retry}
        emptyMessage="Nothing is waiting on you right now."
      >
        {(s) => (
          <div className="flex flex-col gap-4">
            {s.dispatchOverdue.length > 0 && (
              <Card title="Dispatch overdue">
                <ul className="flex flex-col gap-2">
                  {s.dispatchOverdue.map((d) => (
                    <li key={d.poId} className="flex items-center justify-between text-sm">
                      <span>{d.poNo}</span>
                      <Badge tone="bad">
                        <FiFlag className="inline" /> {Math.abs(Math.round(d.hoursLeft ?? 0))}h over
                      </Badge>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/dispatch')}
                >
                  Open Dispatch →
                </button>
              </Card>
            )}

            {s.pilesChasing.length > 0 && (
              <Card title="Waiting on a seller to confirm">
                <ul className="flex flex-col gap-2">
                  {s.pilesChasing.map((p) => (
                    <li key={p.pileId} className="flex items-center justify-between text-sm">
                      <span>
                        {p.boxes} boxes · {p.buyers} buyer{p.buyers === 1 ? '' : 's'}
                      </span>
                      <Badge tone="bad">chase in {p.chaseLeftHours}h</Badge>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/confirmations')}
                >
                  Open Confirmations →
                </button>
              </Card>
            )}

            {s.noSellerAsks > 0 && (
              <Card title="Nobody can supply this">
                <p className="text-sm text-slate-600">
                  {s.noSellerAsks} open ask{s.noSellerAsks === 1 ? '' : 's'} with no seller in scope
                  at all — a brief for the next seller, not a leak.
                </p>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/demand')}
                >
                  Open Demand →
                </button>
              </Card>
            )}

            {s.inspectionsPending.length > 0 && (
              <Card title="Dock findings to apply">
                <p className="text-sm text-slate-600">
                  {s.inspectionsPending.length} inspection
                  {s.inspectionsPending.length === 1 ? '' : 's'} recorded at the dock, still waiting
                  on Purchase to apply (BR-190).
                </p>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/recovery')}
                >
                  Open Recovery →
                </button>
              </Card>
            )}

            {s.returnNotesOld.length > 0 && (
              <Card title="Return notes running out">
                <p className="text-sm text-slate-600">
                  {s.returnNotesOld.length} return note{s.returnNotesOld.length === 1 ? '' : 's'}{' '}
                  past 21 of their 30 lawful days.
                </p>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/recovery')}
                >
                  Open Recovery →
                </button>
              </Card>
            )}

            {s.sellersPendingApproval.length > 0 && (
              <Card title="Registered, no area set">
                <p className="text-sm text-slate-600">
                  {s.sellersPendingApproval.length} seller registration
                  {s.sellersPendingApproval.length === 1 ? '' : 's'} waiting on Purchase — no area,
                  no listing (BR-083).
                </p>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/sellers')}
                >
                  Open Sellers →
                </button>
              </Card>
            )}

            {s.funnel && (
              <Card title="Leaks closed — funnel and leak analytics (BR-275)">
                <p className="mb-4 text-sm text-slate-500">
                  The last {s.funnel.windowDays} days. Counts, hours and percentages only.
                </p>
                <FunnelMetricsGrid report={s.funnel} />
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
