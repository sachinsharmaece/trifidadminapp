import { useCallback, useState } from 'react';
import { FiPackage, FiTruck, FiPlus, FiCheck } from 'react-icons/fi';
import {
  createConsolidation,
  createTransporter,
  arrangeReturnCollection,
  closeReturnNote,
  getHubPosition,
  getLogisticsDashboard,
  getTransporters,
  recordGoodsIn,
} from '../../api/logistics';
import { getReturnNoteAgeing } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

/**
 * New — M7. The Logistics desk in full: transporter master, hub position
 * and dwell (BR-177's cut-off), consolidation (BR-178 — physical grouping
 * only, QR-014 unaffected), return-note collection (ST-12's missing middle
 * state), and the dashboard. BR-071 — nothing on this page ever shows a
 * firm name or a rupee figure.
 */
export function LogisticsDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Logistics</h1>
      <DashboardSection />
      <TransporterSection />
      <GoodsInSection />
      <HubPositionSection />
      <ConsolidationSection />
      <ReturnCollectionSection />
    </div>
  );
}

function DashboardSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getLogisticsDashboard(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <Card title="Dashboard">
      <AsyncBoundary state={state} onRetry={retry}>
        {(d) => (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="At hub" value={d.atHubCount} />
            <Stat
              label="Dispatch overdue"
              value={d.overdueDispatchCount}
              tone={d.overdueDispatchCount > 0 ? 'bad' : undefined}
            />
            <Stat label="Open return notes" value={d.openReturnNotes} />
            <Stat
              label="Return notes overdue"
              value={d.overdueReturnNotes}
              tone={d.overdueReturnNotes > 0 ? 'bad' : undefined}
            />
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'bad' }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-2xl font-semibold ${tone === 'bad' ? 'text-danger-600' : 'text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}

function TransporterSection() {
  const { callApi } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const loader = useCallback(() => callApi((token) => getTransporters(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  async function handleAdd(): Promise<void> {
    await callApi((token) =>
      createTransporter(token, {
        name,
        mobile: mobile || undefined,
        vehicleType: vehicleType || undefined,
      }),
    );
    setName('');
    setMobile('');
    setVehicleType('');
    retry();
  }

  return (
    <Card title="Transporter master (BR-176)">
      <div className="mb-4 flex max-w-2xl flex-wrap items-end gap-3">
        <Input id="tr-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          id="tr-mobile"
          label="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <Input
          id="tr-vehicle"
          label="Vehicle type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        />
        <Button onClick={() => void handleAdd()} disabled={!name} icon={<FiPlus />}>
          Add
        </Button>
      </div>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No transporters yet.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>Vehicle</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.transporterId}>
                  <Td>{t.name}</Td>
                  <Td>{t.mobile ?? '—'}</Td>
                  <Td>{t.vehicleType ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function GoodsInSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setError(null);
    try {
      const r = await callApi((token) => recordGoodsIn(token, poId));
      setResult(r.receivedAt);
    } catch {
      setError('Could not record goods-in for this PO.');
    }
  }

  return (
    <Card title="Goods-in — the hub-position anchor">
      <p className="mb-4 text-sm text-slate-500">
        New this session: when goods physically arrive, distinct from the dock&apos;s own signed
        inspection. Feeds hub dwell time and the BR-177 18:00 cut-off below.
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input id="gi-po" label="PO ID" value={poId} onChange={(e) => setPoId(e.target.value)} />
        <Button onClick={() => void handleSubmit()} disabled={!poId} icon={<FiPackage />}>
          Record goods-in
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Recorded at {result}.</p>}
      </div>
    </Card>
  );
}

function HubPositionSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getHubPosition(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Hub position and dwell (BR-177)">
      <p className="mb-4 text-sm text-slate-500">
        The 18:00 same-day/next-day cut-off only. The second BR-177 clause — pairing two
        same-buyer/same-location orders, the first held to 16:00 — needs a buyer+location join this
        does not make; flagged, not built.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing at the hub.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Dwell (hrs)</Th>
                <Th>Inspected</Th>
                <Th>Same-day eligible</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.poId}>
                  <Td>{item.poId.slice(-6)}</Td>
                  <Td>{item.dwellHours}</Td>
                  <Td>{item.inspected ? 'Yes' : 'No'}</Td>
                  <Td>
                    <Badge tone={item.dispatchEligibleToday ? 'good' : 'bad'}>
                      {item.dispatchEligibleToday ? 'Yes' : 'No — next day'}
                    </Badge>
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

function ConsolidationSection() {
  const { callApi } = useAuth();
  const [movementIdsRaw, setMovementIdsRaw] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setError(null);
    const movementIds = movementIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const r = await callApi((token) => createConsolidation(token, movementIds));
      setResult(r.consolidationNo);
    } catch {
      setError('Could not consolidate — check the movement IDs (leg-2 only, at least two).');
    }
  }

  return (
    <Card title="Consolidation — physical grouping only (BR-178)">
      <p className="mb-4 text-sm text-slate-500">
        Several leg-2 movements riding in one vehicle get one shared reference. This never touches
        billing — each SO still gets exactly one Marg invoice (QR-014).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="cons-movements"
          label="Movement IDs (comma-separated)"
          value={movementIdsRaw}
          onChange={(e) => setMovementIdsRaw(e.target.value)}
        />
        <Button onClick={() => void handleSubmit()} icon={<FiTruck />}>
          Consolidate
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Created {result}.</p>}
      </div>
    </Card>
  );
}

function ReturnCollectionSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getReturnNoteAgeing(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Return-note collection (ST-12)">
      <p className="mb-4 text-sm text-slate-500">
        The missing middle state — raised → collection arranged → returned. Ageing itself is
        Purchase&apos;s own read (BR-189); this only adds the two closing actions.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing outstanding.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Return note</Th>
                <Th>PO</Th>
                <Th>Days old</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.returnNoteId}>
                  <Td>{item.returnNoteId.slice(-6)}</Td>
                  <Td>{item.poId.slice(-6)}</Td>
                  <Td>{item.daysOld}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void callApi((token) =>
                            arrangeReturnCollection(token, item.returnNoteId),
                          ).then(() => retry())
                        }
                      >
                        Arrange collection
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<FiCheck />}
                        onClick={() =>
                          void callApi((token) => closeReturnNote(token, item.returnNoteId)).then(
                            () => retry(),
                          )
                        }
                      >
                        Close
                      </Button>
                    </div>
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
