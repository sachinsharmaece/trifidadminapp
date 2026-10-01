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
  getSupplyMatrixByProduct,
  getAbsorptionQueue,
  getOnBoardNotQuotedQueue,
  type ActiveDemandItem,
  type PileAwaitingDecisionItem,
  type DispatchQueueItem,
  type InspectionPendingApplyItem,
  type ReturnNoteAgeingItem,
  type FunnelReport,
  type AbsorptionQueueItem,
  type OnBoardNotQuotedItem,
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
  noSellerAsks: ActiveDemandItem[];
  openBoxes: number;
  catalogueEntries: number;
  carryNeverListed: number;
  pilesChasing: PileAwaitingDecisionItem[];
  dispatchOverdue: DispatchQueueItem[];
  inspectionsPending: InspectionPendingApplyItem[];
  returnNotesOld: ReturnNoteAgeingItem[];
  sellersPendingApproval: RegistrationListItem[];
  absorptionPending: AbsorptionQueueItem[];
  onBoardNotQuoted: OnBoardNotQuotedItem[];
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
    const [
      demand,
      piles,
      dispatch,
      inspections,
      returns,
      registrations,
      matrix,
      funnel,
      absorption,
      onBoardNotQuoted,
    ] = await Promise.all([
      callApi((token) => getActiveDemandList(token)),
      callApi((token) => getPilesAwaitingDecision(token)),
      callApi((token) => getDispatchChaseQueue(token)),
      callApi((token) => getInspectionsPendingApply(token)),
      callApi((token) => getReturnNoteAgeing(token)),
      callApi((token) => listRegistrations(token, 'pending')),
      callApi((token) => getSupplyMatrixByProduct(token)),
      hasPermission(PERMISSIONS.FUNNEL_READ)
        ? callApi((token) => getFunnelReport(token))
        : Promise.resolve(null),
      hasPermission(PERMISSIONS.ABSORPTION_READ)
        ? callApi((token) => getAbsorptionQueue(token))
        : Promise.resolve([]),
      callApi((token) => getOnBoardNotQuotedQueue(token)),
    ]);
    return {
      noSellerAsks: demand.filter((d) => d.noSeller),
      openBoxes: demand.reduce((sum, d) => sum + d.qty, 0),
      catalogueEntries: matrix.reduce((sum, r) => sum + r.carryCount, 0),
      carryNeverListed: matrix.filter((r) => r.carryCount > 0 && r.listedCount === 0).length,
      pilesChasing: piles.filter((p) => p.chaseLeftHours <= 3),
      dispatchOverdue: dispatch.filter((d) => d.bucket === 'overdue'),
      inspectionsPending: inspections,
      returnNotesOld: returns.filter((r) => r.daysOld > 21),
      sellersPendingApproval: registrations.filter((r) => r.kind !== 'buyer'),
      absorptionPending: absorption.filter((a) => a.status === 'pending'),
      onBoardNotQuoted,
      funnel,
    };
  }, [callApi, hasPermission]);

  const { state, retry } = useAsyncData(
    loader,
    (s) =>
      s.noSellerAsks.length +
        s.pilesChasing.length +
        s.dispatchOverdue.length +
        s.inspectionsPending.length +
        s.returnNotesOld.length +
        s.sellersPendingApproval.length +
        s.absorptionPending.length +
        s.onBoardNotQuoted.length ===
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Open boxes" value={s.openBoxes} />
              <Kpi label="Catalogue entries" value={s.catalogueEntries} />
              <Kpi label="Carry, never listed" value={s.carryNeverListed} />
              <Kpi
                label="On your plate"
                value={
                  s.noSellerAsks.length +
                  s.pilesChasing.length +
                  s.dispatchOverdue.length +
                  s.inspectionsPending.length +
                  s.returnNotesOld.length +
                  s.sellersPendingApproval.length +
                  s.absorptionPending.length +
                  s.onBoardNotQuoted.length
                }
              />
            </div>

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
                        {p.sellerFirm} — {p.brand} · {p.boxes} boxes · {p.buyers} buyer
                        {p.buyers === 1 ? '' : 's'}
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

            {s.noSellerAsks.length > 0 && (
              <Card title="Nobody can supply this">
                <ul className="flex flex-col gap-2">
                  {s.noSellerAsks.map((d) => (
                    <li key={d.askId} className="flex items-center justify-between text-sm">
                      <span>
                        {d.brand} — {d.qty} boxes
                      </span>
                      <Badge tone="bad">no seller in scope</Badge>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-3 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => navigate('/purchase/demand')}
                >
                  Open Demand →
                </button>
              </Card>
            )}

            {s.onBoardNotQuoted.length > 0 && (
              <Card title="On the board, not quoted">
                <p className="mb-3 text-sm text-slate-600">
                  A seller already has a live listing reaching the ask but hasn't quoted it yet.
                </p>
                <ul className="flex flex-col gap-2">
                  {s.onBoardNotQuoted.map((o) => (
                    <li key={o.askId} className="flex items-center justify-between text-sm">
                      <span>
                        {o.brand} — {o.qty} boxes
                      </span>
                      <Badge tone="warn">
                        {o.sellersListedNotQuoted} seller{o.sellersListedNotQuoted === 1 ? '' : 's'}{' '}
                        listed, silent
                      </Badge>
                    </li>
                  ))}
                </ul>
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

            {s.absorptionPending.length > 0 && (
              <Card title="Replacement offers pending">
                <p className="mb-3 text-sm text-slate-600">
                  {s.absorptionPending.length} SO
                  {s.absorptionPending.length === 1 ? '' : 's'} offered a replacement, awaiting the
                  buyer's answer before the offer expires (IC-06 — no cap, no source rate shown
                  here).
                </p>
                <ul className="flex flex-col gap-2">
                  {s.absorptionPending.map((a) => (
                    <li key={a.soId} className="flex items-center justify-between text-sm">
                      <span>SO {a.soId.slice(-6)}</span>
                      <Badge tone={a.withinCap ? 'good' : 'warn'}>
                        expires {new Date(a.expiresAt).toLocaleString()}
                      </Badge>
                    </li>
                  ))}
                </ul>
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
