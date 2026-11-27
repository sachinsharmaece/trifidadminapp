import { useState } from 'react';
import { FileField, uploadFile } from '@/components/ref/FileField';
import { refSend } from '@/lib/refApi';
import { todayInIndia } from '@/utils/format';
import {
  Card,
  Pill,
  bookWithText,
  fmtDate,
  type BilledBill,
  type Trip,
  type Vehicle,
} from './dockTypes';

type WithBusy = (fn: () => Promise<void>) => Promise<void>;
interface Transporter {
  id: string;
  name: string;
}

async function sendOrThrow<T = unknown>(path: string, body: object) {
  const res = await refSend<T>('POST', path, body);
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

/* ------------------------------- Billed ------------------------------- */

export function BilledTab({
  bills,
  trips,
  transporters,
  vehicles,
  busy,
  withBusy,
  reloadAll,
  reloadTransporters,
}: {
  bills: BilledBill[];
  trips: Trip[];
  transporters: Transporter[];
  vehicles: Vehicle[];
  busy: boolean;
  withBusy: WithBusy;
  reloadAll: () => Promise<void>;
  reloadTransporters: () => Promise<void>;
}) {
  const planned = trips.filter((t) => t.status === 'PLANNED');
  const [loadTripId, setLoadTripId] = useState<string | null>(null);
  const [bookWith, setBookWith] = useState<Record<string, string>>({});
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newTransporterName, setNewTransporterName] = useState('');
  const loadingTrip = planned.find((t) => t.id === loadTripId) ?? planned[0] ?? null;

  async function createTrip() {
    if (!newVehicleId) throw new Error('Pick a vehicle');
    const data = await sendOrThrow<{ trip: { id: string } }>('/trips', {
      plannedDate: todayInIndia(),
      vehicleOwnerId: newVehicleId,
    });
    setNewTripOpen(false);
    setLoadTripId(data.trip.id);
    await reloadAll();
  }

  async function addToTrip(bill: BilledBill) {
    if (!loadingTrip) throw new Error('No trip is loading');
    const chosen = bookWith[bill.salesOrderId] ?? 'BUS';
    const transporter = transporters.find((t) => t.id === chosen);
    await sendOrThrow(`/trips/${loadingTrip.id}/bills`, {
      version: loadingTrip.version,
      salesOrderId: bill.salesOrderId,
      bookWith: transporter
        ? { mode: 'TRANSPORT', transporter: transporter.name }
        : { mode: 'BUS' },
    });
    await reloadAll();
  }

  async function addTransporter() {
    if (!newTransporterName.trim()) return;
    await sendOrThrow('/transporters', { name: newTransporterName.trim() });
    setNewTransporterName('');
    await reloadTransporters();
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 text-xs text-zinc-500">
        Everything here is billed in Marg and goes out. Bills are added to the trip below.
      </p>
      {loadingTrip ? (
        <Card highlight>
          <div className="text-xs font-semibold uppercase text-blue-700">Loading into</div>
          <div className="text-lg font-bold">
            {loadingTrip.code} ·{' '}
            <span className="font-mono text-base">{loadingTrip.vehicleNumber}</span>
          </div>
          <div className="text-xs text-zinc-500">
            {loadingTrip.driverName} · {loadingTrip.driverMobile}
            {loadingTrip.vehicleType ? ` · ${loadingTrip.vehicleType}` : ''}
          </div>
          {planned.length > 1 && (
            <div className="flex gap-1">
              {planned.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLoadTripId(t.id)}
                  className={`rounded px-2 py-1 text-xs ${t.id === loadingTrip.id ? 'bg-zinc-900 text-white' : 'border border-zinc-300'}`}
                >
                  {t.code} · {t.vehicleNumber}
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-zinc-500">{loadingTrip.bills.length} bills loaded</div>
          <button
            type="button"
            onClick={() => setNewTripOpen(true)}
            className="min-h-9 rounded border border-zinc-300 text-xs"
          >
            + Another trip
          </button>
        </Card>
      ) : (
        <Card highlight>
          <div className="text-sm font-semibold">No trip is loading</div>
          <p className="text-xs text-zinc-500">
            Create a trip and pick its vehicle, then add bills here.
          </p>
          <button
            type="button"
            onClick={() => setNewTripOpen(true)}
            className="min-h-11 rounded bg-blue-700 text-sm font-semibold text-white"
          >
            + Create trip
          </button>
        </Card>
      )}

      {newTripOpen && (
        <Card>
          <div className="text-sm font-semibold">New trip</div>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Vehicle
            <select
              aria-label="Vehicle"
              value={newVehicleId}
              onChange={(e) => setNewVehicleId(e.target.value)}
              className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
            >
              <option value="">Select…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNo} · {v.owner} · {v.type}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void withBusy(createTrip)}
              className="min-h-11 flex-1 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create trip
            </button>
            <button
              type="button"
              onClick={() => setNewTripOpen(false)}
              className="min-h-11 rounded border border-zinc-300 px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {bills.length === 0 && (
        <p className="text-sm text-zinc-400">Nothing waiting. Every billed order is on a trip.</p>
      )}
      {bills.map((bill) => (
        <Card key={bill.salesOrderId}>
          <div className="flex items-start justify-between" data-testid="billed-bill">
            <div>
              <div className="text-base font-bold">{bill.destination}</div>
              <div className="font-mono text-xs text-zinc-400">
                {bill.margInvoiceNumber} · {bill.soNumber} · {bill.items.length} item
                {bill.items.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-base font-bold">{bill.boxes} boxes</div>
          </div>
          {loadingTrip && (
            <>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Book with
                <select
                  aria-label="Book with"
                  value={bookWith[bill.salesOrderId] ?? 'BUS'}
                  onChange={(e) =>
                    setBookWith((p) => ({ ...p, [bill.salesOrderId]: e.target.value }))
                  }
                  className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
                >
                  <option value="BUS">Bus (parcel)</option>
                  {transporters.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void withBusy(() => addToTrip(bill))}
                className="min-h-11 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add to {loadingTrip.code} · {loadingTrip.vehicleNumber}
              </button>
            </>
          )}
        </Card>
      ))}

      <Card>
        <div className="text-xs font-semibold">Add a transporter</div>
        <div className="flex gap-2">
          <input
            value={newTransporterName}
            onChange={(e) => setNewTransporterName(e.target.value)}
            placeholder="Transporter name"
            className="min-h-11 flex-1 rounded border border-zinc-300 px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void withBusy(addTransporter)}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
          >
            Add
          </button>
        </div>
      </Card>
      <p className="text-[11px] text-zinc-400">No firm names and no money on this desk.</p>
    </div>
  );
}

/* ------------------------------- Trips ------------------------------- */

export function TripsTab({
  trips,
  busy,
  withBusy,
  reload,
}: {
  trips: Trip[];
  busy: boolean;
  withBusy: WithBusy;
  reload: () => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [podDrafts, setPodDrafts] = useState<
    Record<string, { ref: string; photoFileId: string | null }>
  >({});
  const trip = trips.find((t) => t.id === openId) ?? trips[0] ?? null;

  async function checkOut(t: Trip) {
    const data = await sendOrThrow<{ trip: Trip }>(`/trips/${t.id}/check-out`, {
      version: t.version,
    });
    await reload();
    const text = data.trip.whatsappText ?? '';
    window.open(`https://wa.me/91${t.driverMobile}?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function uploadPod(t: Trip, bill: Trip['bills'][number]) {
    const draft = podDrafts[bill.salesOrderId];
    if (!draft?.ref || !draft.photoFileId)
      throw new Error('LR/receipt number and photo are required');
    await sendOrThrow(`/trips/${t.id}/bills/${bill.salesOrderId}/pod`, {
      version: bill.tradeVersion,
      ref: draft.ref,
      date: todayInIndia(),
      photoFileId: draft.photoFileId,
    });
    await reload();
  }

  if (!trip) return <p className="text-sm text-zinc-400">No trips yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        A trip is one vehicle&apos;s round from the dock. It closes when every bill has its LR.
      </p>
      <div className="flex gap-1 overflow-x-auto">
        {trips.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpenId(t.id)}
            className={`whitespace-nowrap rounded px-2 py-1 text-xs ${t.id === trip.id ? 'bg-zinc-900 text-white' : 'border border-zinc-300'}`}
          >
            {t.code} · {t.status.toLowerCase()}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            {trip.code} · {fmtDate(trip.plannedDate)}
          </div>
          <Pill tone={trip.status === 'CLOSED' ? 'ok' : trip.status === 'OUT' ? 'warn' : 'mu'}>
            {trip.status}
          </Pill>
        </div>
        <div className="text-xs text-zinc-500">
          {trip.vehicleNumber} · {trip.driverName} · {trip.driverMobile}
          {trip.vehicleType ? ` · ${trip.vehicleType}` : ''}
        </div>
      </Card>

      {trip.status === 'PLANNED' && (
        <Card>
          <div className="text-sm font-semibold">Check out</div>
          <p className="text-xs text-zinc-500">
            Marks the vehicle out of the dock and opens WhatsApp. Bills can no longer be added after
            this.
          </p>
          <button
            type="button"
            disabled={busy || trip.bills.length === 0}
            onClick={() => void withBusy(() => checkOut(trip))}
            className="min-h-11 rounded bg-emerald-700 text-sm font-semibold text-white disabled:opacity-50"
          >
            Check out · send WhatsApp
          </button>
        </Card>
      )}

      {trip.bills.map((b) => {
        const draft = podDrafts[b.salesOrderId] ?? { ref: '', photoFileId: null };
        const bookWith = bookWithText(b.bookWith);
        return (
          <Card key={b.salesOrderId}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold">{b.destination}</div>
                <div className="font-mono text-xs text-zinc-400">
                  {b.margInvoiceNumber} · {b.soNumber}
                </div>
              </div>
              <div className="text-base font-bold">{b.boxes} boxes</div>
            </div>
            <Pill tone={b.pod ? 'ok' : trip.status === 'PLANNED' ? 'mu' : 'warn'}>
              {b.pod ? 'LR in · b9' : trip.status === 'PLANNED' ? 'Loading' : 'LR pending'}
            </Pill>
            <div className="text-xs text-zinc-500">
              Booked with <b>{bookWith}</b>
            </div>
            {!b.pod && trip.status === 'OUT' && (
              <>
                <label className="flex flex-col gap-1 text-xs text-zinc-600">
                  {bookWith === 'Bus (parcel)' ? 'Receipt / bus no.' : 'LR number'}
                  <input
                    aria-label="LR or receipt number"
                    value={draft.ref}
                    onChange={(e) =>
                      setPodDrafts((p) => ({
                        ...p,
                        [b.salesOrderId]: { ...draft, ref: e.target.value },
                      }))
                    }
                    className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
                  />
                </label>
                <FileField
                  label="LR / receipt photo"
                  accept="image/jpeg,image/png"
                  capture
                  fileName={draft.photoFileId ? 'Photo selected' : null}
                  onFile={(f) =>
                    void withBusy(async () => {
                      const fileId = await uploadFile(f);
                      setPodDrafts((p) => ({
                        ...p,
                        [b.salesOrderId]: { ...draft, photoFileId: fileId },
                      }));
                    })
                  }
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withBusy(() => uploadPod(trip, b))}
                  className="min-h-11 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Upload as POD
                </button>
              </>
            )}
            {b.pod && <div className="font-mono text-xs text-zinc-500">{b.pod.ref}</div>}
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------- Vehicles ------------------------------- */

const EMPTY = {
  name: '',
  mobile: '',
  vehicleNumber: '',
  vehicleType: '',
  seatingArea: '',
  aadhaar: '',
  licenceNo: '',
};

export function VehiclesTab({
  vehicles,
  busy,
  withBusy,
  reload,
}: {
  vehicles: Vehicle[];
  busy: boolean;
  withBusy: WithBusy;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [driverPhotoFileId, setDriverPhotoFileId] = useState<string | null>(null);
  const [vehiclePhotoFileId, setVehiclePhotoFileId] = useState<string | null>(null);

  async function save() {
    await sendOrThrow('/vehicles', {
      ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')),
      ...(driverPhotoFileId ? { driverPhotoFileId } : {}),
      ...(vehiclePhotoFileId ? { vehiclePhotoFileId } : {}),
    });
    setOpen(false);
    setForm(EMPTY);
    setDriverPhotoFileId(null);
    setVehiclePhotoFileId(null);
    await reload();
  }

  const input = 'min-h-11 rounded border border-zinc-300 px-2 text-sm';
  const field = (key: keyof typeof EMPTY, placeholder: string) => (
    <input
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      className={input}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Vehicle owners who carry TriFid goods. No login — instructions go on WhatsApp/phone.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-9 rounded border border-zinc-300 px-2 text-xs"
        >
          + Add
        </button>
      </div>
      {open && (
        <Card highlight>
          <div className="grid grid-cols-2 gap-2">
            {field('vehicleNumber', 'Vehicle no.')}
            {field('vehicleType', 'Type')}
          </div>
          {field('name', 'Owner / driver name')}
          <div className="grid grid-cols-2 gap-2">
            {field('mobile', 'Mobile (10 digits)')}
            {field('seatingArea', 'Seating area')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field('aadhaar', 'Aadhaar (12 digits)')}
            {field('licenceNo', 'Licence no.')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FileField
              label="Driver photo"
              accept="image/jpeg,image/png"
              capture
              fileName={driverPhotoFileId ? 'Added' : null}
              onFile={(f) => void withBusy(async () => setDriverPhotoFileId(await uploadFile(f)))}
            />
            <FileField
              label="Vehicle photo"
              accept="image/jpeg,image/png"
              capture
              fileName={vehiclePhotoFileId ? 'Added' : null}
              onFile={(f) => void withBusy(async () => setVehiclePhotoFileId(await uploadFile(f)))}
            />
          </div>
          <p className="text-[11px] text-zinc-400">
            Aadhaar shows masked (last 4) everywhere after saving.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void withBusy(save)}
              className="min-h-11 flex-1 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save vehicle
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded border border-zinc-300 px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}
      {vehicles.map((v) => (
        <Card key={v.id}>
          <div className="flex gap-3" data-testid="vehicle">
            <div className="flex gap-1">
              <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-100 text-center text-[9px] text-zinc-400">
                {v.hasDriverPhoto ? 'Driver photo' : 'No driver photo'}
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-100 text-center text-[9px] text-zinc-400">
                {v.hasVehiclePhoto ? 'Vehicle photo' : 'No vehicle photo'}
              </div>
            </div>
            <dl className="flex-1 text-xs">
              <dt className="text-zinc-400">Vehicle</dt>
              <dd className="font-mono">
                {v.vehicleNo} · {v.type}
              </dd>
              <dt className="text-zinc-400">Owner</dt>
              <dd>{v.owner}</dd>
              <dt className="text-zinc-400">Mobile</dt>
              <dd>{v.mobile}</dd>
              {v.aadhaarLast4 && (
                <>
                  <dt className="text-zinc-400">Aadhaar</dt>
                  <dd className="font-mono">XXXX XXXX {v.aadhaarLast4}</dd>
                </>
              )}
            </dl>
          </div>
          {(!v.hasDriverPhoto || !v.hasVehiclePhoto) && (
            <Pill tone="warn">Photo missing — add before this vehicle is used.</Pill>
          )}
        </Card>
      ))}
    </div>
  );
}
