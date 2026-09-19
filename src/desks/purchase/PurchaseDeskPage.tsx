import { useCallback, useState } from 'react';
import { FiFlag } from 'react-icons/fi';
import {
  getActiveDemandList,
  getAbsorptionQueue,
  getFunnelReport,
  getReturnNoteAgeing,
  getSellerRecoveryQueue,
  postNonOrderReason,
  type ActiveDemandItem,
} from '../../api/purchase';
import { PERMISSIONS } from '../../lib/permissions';
import { FunnelMetricsGrid } from './FunnelMetrics';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

const SUPPLY_GAP_CODES = [
  'rate_above_market',
  'expiry_too_short',
  'delivery_too_slow',
  'moq_too_big',
  'quantity_short',
  'no_seller_in_scope',
] as const;

/**
 * CH §19.8 — kept deliberately small: the active demand list (with the
 * No-seller filter, BR-270), the absorption queue (delta and within-cap
 * only — IC-06), and return-note ageing (BR-189). BR-069 — nothing on this
 * page ever shows a buyer's identity or a rupee figure.
 */
export function PurchaseDeskPage() {
  const { hasPermission } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Purchase</h1>
      <DevNote screen="purchase_desk" />
      {hasPermission(PERMISSIONS.FUNNEL_READ) && <FunnelSection />}
      <ActiveDemandSection />
      <AbsorptionQueueSection />
      <ReturnAgeingSection />
      <SellerRecoverySection />
    </div>
  );
}

/**
 * New — M8, BR-275. "Purchase is measured on leaks closed, not orders placed."
 * Each figure states its own formula; the window is fixed, not a setting.
 */
function FunnelSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getFunnelReport(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <Card title="Leaks closed — funnel and leak analytics (BR-275)">
      <AsyncBoundary state={state} onRetry={retry}>
        {(report) => (
          <>
            <p className="mb-4 text-sm text-slate-500">
              The last {report.windowDays} days, counted from live data. Counts, hours and
              percentages only — no rupee figure and no buyer identity (BR-067, BR-069).
            </p>
            <FunnelMetricsGrid report={report} />
          </>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ActiveDemandSection() {
  const { callApi } = useAuth();
  const [noSellerOnly, setNoSellerOnly] = useState(false);
  const loader = useCallback(
    () => callApi((token) => getActiveDemandList(token, noSellerOnly)),
    [callApi, noSellerOnly],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Active demand">
      <p className="mb-4 text-sm text-slate-500">
        BR-272 — how many sellers are quoted, active, dormant or dark against each open ask. No
        buyer identity, no rupee figure (BR-069).
      </p>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={noSellerOnly}
          onChange={(e) => setNoSellerOnly(e.target.checked)}
        />
        No-seller only (BR-270 — an opportunity, not a leak)
      </label>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing open right now.">
        {(items: ActiveDemandItem[]) => (
          <Table className="mb-4">
            <thead>
              <tr>
                <Th>Ask</Th>
                <Th>Boxes</Th>
                <Th>Quoted</Th>
                <Th>Active</Th>
                <Th>Dormant</Th>
                <Th>No seller</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.askId}>
                  <Td>{item.askId.slice(-6)}</Td>
                  <Td>{item.qty}</Td>
                  <Td>{item.sellerCounts.quoted}</Td>
                  <Td>{item.sellerCounts.active}</Td>
                  <Td>{item.sellerCounts.dormant}</Td>
                  <Td>
                    {item.noSeller && (
                      <Badge tone="warn">
                        <FiFlag className="inline" /> No seller
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <NonOrderReasonForm askId={item.askId} onRecorded={retry} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function NonOrderReasonForm({ askId, onRecorded }: { askId: string; onRecorded: () => void }) {
  const { callApi } = useAuth();
  const [code, setCode] = useState<string>(SUPPLY_GAP_CODES[0]);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select
        id={`nor-${askId}`}
        label=""
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="text-xs"
      >
        {SUPPLY_GAP_CODES.map((c) => (
          <option key={c} value={c}>
            {c.replaceAll('_', ' ')}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          void callApi((token) => postNonOrderReason(token, { askId, code })).then(() => {
            setSaved(true);
            onRecorded();
          })
        }
      >
        {saved ? 'Saved' : 'Log reason'}
      </Button>
    </div>
  );
}

function AbsorptionQueueSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getAbsorptionQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Absorption (WF-11)">
      <p className="mb-4 text-sm text-slate-500">
        IC-06 — delta and within-cap only. This screen never shows the absorption cap or either
        seller&apos;s rate, by construction — the API response carries neither.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No replacement offers right now.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>SO</Th>
                <Th>Status</Th>
                <Th>Delta</Th>
                <Th>Within cap</Th>
                <Th>Expires</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.soId}>
                  <Td>{item.soId.slice(-6)}</Td>
                  <Td>
                    <Badge
                      tone={
                        item.status === 'accepted'
                          ? 'good'
                          : item.status === 'pending'
                            ? 'warn'
                            : 'bad'
                      }
                    >
                      {item.status}
                    </Badge>
                  </Td>
                  <Td>₹{(item.deltaPaise / 100).toFixed(2)}</Td>
                  <Td>{item.withinCap ? 'Yes' : 'No'}</Td>
                  <Td>{new Date(item.expiresAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ReturnAgeingSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getReturnNoteAgeing(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Return notes — ageing (BR-189)">
      <p className="mb-4 text-sm text-slate-500">
        30-day clock. Day 31 itself is still open (QR-021) — this only reports age, it does not
        decide what happens past it.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing outstanding.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Cases</Th>
                <Th>Days old</Th>
                <Th>Overdue</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.returnNoteId}>
                  <Td>{item.poId.slice(-6)}</Td>
                  <Td>{item.cases}</Td>
                  <Td>{item.daysOld}</Td>
                  <Td>
                    {item.overdue && (
                      <Badge tone="bad">
                        <FiFlag className="inline" /> Past 30 days
                      </Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

// New — M7, BR-206. The seller-recovery half of a Controller-decided
// dispute: never the buyer, never the buyer's own note (that is Sales's
// complaint queue).
function SellerRecoverySection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSellerRecoveryQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Seller recovery — Controller-decided disputes (BR-206)">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing to recover.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Debit note</Th>
                <Th>Decided</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.complaintId}>
                  <Td>{item.sellerId.slice(-6)}</Td>
                  <Td>{item.debitNoteId ? item.debitNoteId.slice(-6) : '—'}</Td>
                  <Td>{item.decidedAt ? new Date(item.decidedAt).toLocaleDateString() : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
