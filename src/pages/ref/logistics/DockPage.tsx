import { useCallback, useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import { ArrivedTab, ComingTab, InspectTab } from './DockLotTabs';
import { BilledTab, TripsTab, VehiclesTab } from './DockTripTabs';
import type { BilledBill, DockLot, Trip, Vehicle } from './dockTypes';
import { StockComingLots, StockInspectLots, type StockLot } from './DockStockLots';

type Tab = 'coming' | 'arrived' | 'inspect' | 'billed' | 'trips' | 'vehicles';

const TABS: { id: Tab; label: string }[] = [
  { id: 'coming', label: 'Coming' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'billed', label: 'Billed' },
  { id: 'trips', label: 'Trips' },
  { id: 'vehicles', label: 'Vehicles' },
];

/**
 * Logistics → Dock (new), as the reference (app/(logistics)/dock): one phone-first page with bottom tabs —
 * Coming (record arrival + photo), Arrived, Inspect (per line, count short carried from arrival, photos),
 * Billed (load bills into a trip), Trips (check out on WhatsApp, LR/receipt as POD with a photo), Vehicles.
 */
export function DockPage() {
  useDocumentTitle('Dock');
  const [tab, setTab] = useState<Tab>('coming');
  const [coming, setComing] = useState<DockLot[]>([]);
  const [arrived, setArrived] = useState<DockLot[]>([]);
  const [inspected, setInspected] = useState<DockLot[]>([]);
  // Stock POs (Fast order): TriFid buying into its own stock goes through the same dock.
  const [stockComing, setStockComing] = useState<StockLot[]>([]);
  const [stockArrived, setStockArrived] = useState<StockLot[]>([]);
  const [bills, setBills] = useState<BilledBill[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transporters, setTransporters] = useState<{ id: string; name: string }[]>([]);
  const [inspectPoId, setInspectPoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDock = useCallback(async () => {
    const [c, a, k] = await Promise.all(
      ['COMING', 'ARRIVED', 'CHECKED'].map((lane) =>
        refGet<{ rows: DockLot[] }>('/dock', { lane, pageSize: 100 }),
      ),
    );
    setComing(c?.rows ?? []);
    setArrived(a?.rows ?? []);
    setInspected(k?.rows ?? []);
    const [sc, sa] = await Promise.all(
      (['COMING', 'ARRIVED'] as const).map((lane) =>
        refGet<{ rows: StockLot[] }>('/stock-dock', { lane }),
      ),
    );
    setStockComing(sc?.rows ?? []);
    setStockArrived(sa?.rows ?? []);
  }, []);
  const loadTrips = useCallback(async () => {
    const [billed, ...lists] = await Promise.all([
      refGet<{ bills: BilledBill[] }>('/trips/billed', { pageSize: 100 }),
      ...(['PLANNED', 'OUT', 'CLOSED'] as const).map((status) =>
        refGet<{ trips: Trip[] }>('/trips', { status, pageSize: 100 }),
      ),
    ]);
    setBills(billed.bills ?? []);
    setTrips(lists.flatMap((l) => l.trips ?? []));
  }, []);
  const loadVehicles = useCallback(async () => {
    setVehicles((await refGet<{ vehicles: Vehicle[] }>('/vehicles')).vehicles ?? []);
  }, []);
  const loadTransporters = useCallback(async () => {
    setTransporters(
      (await refGet<{ transporters: { id: string; name: string }[] }>('/transporters'))
        .transporters ?? [],
    );
  }, []);

  useOnMount(() => Promise.all([loadDock(), loadTrips(), loadVehicles(), loadTransporters()]));

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-zinc-50 sm:border-x sm:border-zinc-200">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-900">TriFid · Logistics</h1>
        <p className="text-xs text-zinc-500">Indore dock · anyone in Logistics can act</p>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pb-20 pt-3">
        {error && (
          <p
            className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        {tab === 'coming' && (
          <>
            <ComingTab lots={coming} busy={busy} withBusy={withBusy} reload={loadDock} />
            <StockComingLots lots={stockComing} busy={busy} withBusy={withBusy} reload={loadDock} />
          </>
        )}
        {tab === 'arrived' && (
          <ArrivedTab
            lots={arrived}
            onInspect={(poId) => {
              setInspectPoId(poId);
              setTab('inspect');
            }}
          />
        )}
        {tab === 'inspect' && (
          <InspectTab
            arrived={arrived}
            inspected={inspected}
            openPoId={inspectPoId}
            setOpenPoId={setInspectPoId}
            busy={busy}
            withBusy={withBusy}
            reload={loadDock}
          />
        )}
        {tab === 'inspect' && (
          <StockInspectLots lots={stockArrived} busy={busy} withBusy={withBusy} reload={loadDock} />
        )}
        {tab === 'billed' && (
          <BilledTab
            bills={bills}
            trips={trips}
            transporters={transporters}
            vehicles={vehicles}
            busy={busy}
            withBusy={withBusy}
            reloadAll={loadTrips}
            reloadTransporters={loadTransporters}
          />
        )}
        {tab === 'trips' && (
          <TripsTab trips={trips} busy={busy} withBusy={withBusy} reload={loadTrips} />
        )}
        {tab === 'vehicles' && (
          <VehiclesTab vehicles={vehicles} busy={busy} withBusy={withBusy} reload={loadVehicles} />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-zinc-200 bg-white"
        aria-label="Dock tabs"
      >
        <div className="grid grid-cols-6">
          {TABS.map((t) => {
            const count =
              t.id === 'coming'
                ? coming.length + stockComing.length
                : t.id === 'arrived'
                  ? arrived.length + stockArrived.length
                  : t.id === 'billed'
                    ? bills.length
                    : 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  tab === t.id ? 'text-blue-700' : 'text-zinc-500'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className="absolute right-2 top-1 rounded-full bg-zinc-900 px-1 text-[9px] text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
