import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { FormField } from '@/components/molecules/FormField';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { PodFields } from '@/features/trades/billingActionForms';
import type { BilledBill, Trip, TripBill } from '@/features/trips/api';
import {
  useAddBill,
  useBilled,
  useCheckOut,
  useCreateTrip,
  usePlannedTrips,
  useRecordPod,
  useRemoveBill,
  useTrips,
} from '@/features/trips/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import {
  validateAddBill,
  validatePod,
  validateTrip,
  type AddBillValues,
  type PodValues,
  type TripValues,
} from '@/schemas/billingForms';
import {
  BOOK_WITH_LABELS,
  BOOK_WITH_MODES,
  TRIP_STATUS_LABELS,
  type BookWithMode,
  type TripStatus,
} from '@/types/dock';
import { boxesText, formatDateTime, todayInIndia } from '@/utils/format';

const PAGE_SIZE = 25;
type Tab = 'BILLED' | TripStatus;
const TABS: { tab: Tab; label: string }[] = [
  { tab: 'BILLED', label: 'Billed: to load' },
  { tab: 'PLANNED', label: 'Planned' },
  { tab: 'OUT', label: 'Out' },
  { tab: 'CLOSED', label: 'Closed' },
];

/** "New trip": the date, the vehicle and its driver. */
function NewTripForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTrip();
  const [values, setValues] = useState<TripValues>({
    plannedDate: todayInIndia(),
    vehicleNumber: '',
    driverName: '',
    driverMobile: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const text = (field: keyof TripValues, label: string, type = 'text') => (
    <FormField label={label} required error={errors[field]}>
      {(props) => (
        <Input
          {...props}
          type={type}
          autoComplete="off"
          value={values[field]}
          onChange={(event) =>
            setValues((current) => ({ ...current, [field]: event.target.value }))
          }
        />
      )}
    </FormField>
  );

  function submit() {
    const result = validateTrip(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    create.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title="New trip"
      description="One vehicle leaving the dock. Add bills to it, then check it out."
      submitLabel="Plan trip"
      pending={create.isPending}
      error={create.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {text('plannedDate', 'Trip date', 'date')}
        {text('vehicleNumber', 'Vehicle number')}
        {text('driverName', "Driver's name")}
        {text('driverMobile', "Driver's mobile")}
      </div>
    </ActionFormShell>
  );
}

/** A billed order waiting for a trip, with "Add to trip". */
function BilledCard({ bill, canAct }: { bill: BilledBill; canAct: boolean }) {
  const [open, setOpen] = useState(false);
  const planned = usePlannedTrips();
  const add = useAddBill();
  const [values, setValues] = useState<AddBillValues>({
    tripId: '',
    mode: 'TRANSPORT',
    transporter: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateAddBill(values);
    if (!result.ok) return setErrors(result.errors);
    const trip = planned.data?.trips.find((item) => item.id === result.data.tripId);
    if (!trip) return setErrors({ tripId: 'Choose a planned trip' });
    setErrors({});
    add.mutate(
      { trip, salesOrderId: bill.salesOrderId, bookWith: result.data.bookWith },
      { onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <li className="space-y-2 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Marg {bill.margInvoiceNumber}</span>
        <span className="text-slate-600">
          {bill.soNumber} · {boxesText(bill.boxes)} → {bill.destination}
        </span>
      </div>
      <ul className="text-slate-700">
        {bill.items.map((item) => (
          <li key={item.lineNo}>
            {item.productName} · {item.packLabel} · {boxesText(item.boxes)}
            <span className="text-xs text-slate-500">
              {' '}
              · batch {item.batch ?? '—'} · expiry {item.expiryMonth ?? '—'}
            </span>
          </li>
        ))}
      </ul>
      {bill.ewayBillNumber && (
        <p className="text-xs text-slate-500">E-way bill {bill.ewayBillNumber}</p>
      )}
      {canAct && !open && (
        <Button size="sm" onClick={() => setOpen(true)}>
          Add to trip
        </Button>
      )}
      {open && (
        <ActionFormShell
          title="Add to trip"
          description="Pick a planned trip and how the bill goes on from our vehicle."
          submitLabel="Add"
          pending={add.isPending}
          error={add.error?.message}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
        >
          {planned.data && planned.data.trips.length === 0 ? (
            <p className="text-sm text-amber-700">No planned trip: use "New trip" first.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Trip" required error={errors.tripId}>
                {(props) => (
                  <Select
                    {...props}
                    value={values.tripId}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, tripId: event.target.value }))
                    }
                  >
                    <option value="">Choose…</option>
                    {(planned.data?.trips ?? []).map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.code} · {trip.plannedDate} · {trip.vehicleNumber}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField label="Book with" required error={errors.mode}>
                {(props) => (
                  <Select
                    {...props}
                    value={values.mode}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        mode: event.target.value as BookWithMode,
                      }))
                    }
                  >
                    {BOOK_WITH_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {BOOK_WITH_LABELS[mode]}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              {values.mode === 'TRANSPORT' && (
                <FormField
                  label="Transport company"
                  required
                  error={errors.transporter ?? errors['bookWith.transporter']}
                >
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="off"
                      value={values.transporter}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, transporter: event.target.value }))
                      }
                    />
                  )}
                </FormField>
              )}
            </div>
          )}
        </ActionFormShell>
      )}
    </li>
  );
}

/** The POD for one bill on a trip that is out. */
function PodRow({ trip, bill, onDone }: { trip: Trip; bill: TripBill; onDone: () => void }) {
  const pod = useRecordPod();
  const [values, setValues] = useState<PodValues>({ ref: '', date: todayInIndia() });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validatePod(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    pod.mutate(
      { trip, bill, pod: result.data },
      { onSuccess: onDone, onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <ActionFormShell
      title={`Proof of dispatch: Marg ${bill.margInvoiceNumber}`}
      description="The LR or receipt number. The buyer moves to Dispatched and the 7-day delivery window starts."
      submitLabel="Save POD"
      pending={pod.isPending}
      error={pod.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <PodFields values={values} errors={errors} onChange={setValues} />
    </ActionFormShell>
  );
}

/** One trip: vehicle, driver, bills; remove and check out while planned; WhatsApp text and PODs once out. */
function TripCard({ trip, canAct }: { trip: Trip; canAct: boolean }) {
  const remove = useRemoveBill();
  const checkOut = useCheckOut();
  const [podFor, setPodFor] = useState<string | null>(null);
  const error = remove.error?.message ?? checkOut.error?.message;
  const boxes = trip.bills.reduce((sum, bill) => sum + bill.boxes, 0);

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{trip.code}</span>
        <span className="text-slate-600">
          {trip.plannedDate} · {trip.vehicleNumber} · {trip.driverName} ({trip.driverMobile}) ·{' '}
          {boxesText(boxes)}
        </span>
        <Badge
          tone={trip.status === 'CLOSED' ? 'success' : trip.status === 'OUT' ? 'info' : 'neutral'}
        >
          {TRIP_STATUS_LABELS[trip.status]}
        </Badge>
      </div>
      {trip.bills.length === 0 && (
        <p className="text-slate-500">No bills yet: add them from Billed.</p>
      )}
      <ul className="divide-y divide-slate-100">
        {trip.bills.map((bill) => (
          <li key={bill.salesOrderId} className="space-y-2 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Marg {bill.margInvoiceNumber}</span>
              <span className="text-slate-600">
                {bill.soNumber} · {boxesText(bill.boxes)} → {bill.destination} ·{' '}
                {bill.bookWith.mode === 'TRANSPORT'
                  ? `book with ${bill.bookWith.transporter ?? ''}`
                  : BOOK_WITH_LABELS[bill.bookWith.mode]}
              </span>
              {bill.pod && (
                <Badge tone="success">
                  POD {bill.pod.ref} · {bill.pod.date}
                </Badge>
              )}
              {canAct && trip.status === 'PLANNED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={remove.isPending}
                  onClick={() => remove.mutate({ trip, salesOrderId: bill.salesOrderId })}
                >
                  Remove
                </Button>
              )}
              {canAct && trip.status === 'OUT' && !bill.pod && podFor !== bill.salesOrderId && (
                <Button size="sm" onClick={() => setPodFor(bill.salesOrderId)}>
                  Proof of dispatch
                </Button>
              )}
            </div>
            {podFor === bill.salesOrderId && (
              <PodRow trip={trip} bill={bill} onDone={() => setPodFor(null)} />
            )}
          </li>
        ))}
      </ul>
      {trip.whatsappText && (
        <div className="space-y-2">
          <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {trip.whatsappText}
          </pre>
          <a
            className="text-sm text-brand-700 hover:underline"
            href={`https://wa.me/?text=${encodeURIComponent(trip.whatsappText)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in WhatsApp
          </a>
        </div>
      )}
      <ErrorAlert message={error} />
      {canAct && trip.status === 'PLANNED' && trip.bills.length > 0 && (
        <Button size="sm" loading={checkOut.isPending} onClick={() => checkOut.mutate(trip)}>
          Check out
        </Button>
      )}
      {trip.closedAt && (
        <p className="text-xs text-slate-500">
          Closed {formatDateTime(trip.closedAt)}: every bill has a POD.
        </p>
      )}
    </li>
  );
}

/**
 * Trips (Logistics; SRS-LOG-06…08). Billed: Marg bills on no trip yet. Planned: add or remove bills, then check
 * out (the WhatsApp text is kept). Out: record each bill's proof of dispatch: the buyer moves to Dispatched.
 * Closed: every bill has a POD. No buyer names or money here. The Controller only looks.
 */
export function TripsPage() {
  const [tab, setTab] = useState<Tab>('BILLED');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useDebouncedValue(search.trim());
  const billed = useBilled({ q, page, pageSize: PAGE_SIZE });
  const trips = useTrips({
    status: tab === 'BILLED' ? 'PLANNED' : tab,
    q,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';
  const list = tab === 'BILLED' ? billed : trips;

  return (
    <PageLayout
      title="Trips"
      description="Load billed orders onto trips, check each trip out of the dock, and record the proof of dispatch."
      actions={
        canAct && !creating ? (
          <Button onClick={() => setCreating(true)}>New trip</Button>
        ) : undefined
      }
    >
      {creating && <NewTripForm onDone={() => setCreating(false)} />}
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button
            key={item.tab}
            size="sm"
            variant={tab === item.tab ? 'primary' : 'secondary'}
            aria-pressed={tab === item.tab}
            onClick={() => {
              setTab(item.tab);
              setPage(1);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder={
          tab === 'BILLED' ? 'Search by order or Marg number' : 'Search by trip code'
        }
        searchLabel="Search trips"
      />
      {list.isPending && <Spinner label="Loading trips" className="h-6 w-6 text-brand-600" />}
      {list.isError && (
        <ErrorState title="Could not load trips" message={list.error.message}>
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {tab === 'BILLED' && billed.isSuccess && (
        <>
          {billed.data.bills.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No billed orders waiting for a trip.
            </p>
          ) : (
            <ul className="space-y-3">
              {billed.data.bills.map((bill) => (
                <BilledCard key={bill.salesOrderId} bill={bill} canAct={canAct} />
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={billed.data.total}
            onPageChange={setPage}
          />
        </>
      )}
      {tab !== 'BILLED' && trips.isSuccess && (
        <>
          {trips.data.trips.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No {TRIP_STATUS_LABELS[tab].toLowerCase()} trips.
            </p>
          ) : (
            <ul className="space-y-3">
              {trips.data.trips.map((trip) => (
                <TripCard key={`${trip.id}-${trip.version}`} trip={trip} canAct={canAct} />
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={trips.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
