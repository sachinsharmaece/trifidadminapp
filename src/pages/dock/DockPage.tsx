import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { DockLane, DockRow } from '@/features/dock/api';
import { ArrivalForm } from '@/features/dock/ArrivalForm';
import { useCorrectInspection, useDock, useInspect, useRecordArrival } from '@/features/dock/hooks';
import { InspectionForm } from '@/features/dock/InspectionForm';
import { leg1Text } from '@/features/purchaseOrders/PurchaseOrderProgress';
import { isChangedByOthers } from '@/features/trades/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { FREIGHT_TERM_LABELS, OUTCOME_LABELS, type InspectionOutcome } from '@/types/dock';
import { boxesText, dueText, formatDateTime } from '@/utils/format';

const PAGE_SIZE = 25;

const LANES: { lane: DockLane; label: string; empty: string }[] = [
  { lane: 'COMING', label: 'Coming', empty: 'Nothing on the way.' },
  { lane: 'ARRIVED', label: 'Arrived: to check', empty: 'Nothing waiting to be checked.' },
  { lane: 'CHECKED', label: 'Checked', empty: 'Nothing checked yet.' },
];

/** All accepted is good news; nothing accepted is bad; the rest need a look. */
const OUTCOME_TONES: Record<InspectionOutcome, 'success' | 'warning' | 'danger'> = {
  O1: 'success',
  O2: 'warning',
  O3: 'warning',
  O4: 'danger',
  O5: 'warning',
};

const CHANGED =
  'Someone else acted on this first, so your change was not saved. The list now shows the latest.';

/** One PO on the dock: where it comes from, what is in it, how it travels, and what the dock found. */
function DockCard({ row, canAct }: { row: DockRow; canAct: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const arrival = useRecordArrival();
  const inspect = useInspect();
  const correct = useCorrectInspection();
  const onError = (error: unknown) => {
    if (isChangedByOthers(error)) {
      setOpen(false);
      setNotice(CHANGED);
    }
  };

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{row.number}</span>
        <span className="text-slate-600">
          from {row.from} · {row.boxes} boxes
        </span>
        {row.status === 'DISPATCHED' && row.daysOnRoad !== null && (
          <Badge tone={row.transitOverdue ? 'danger' : 'neutral'}>
            {row.daysOnRoad === 0 ? 'Left today' : `${row.daysOnRoad} days on the road`}
          </Badge>
        )}
        {row.status === 'ARRIVED' && row.inspectBy && (
          <Badge tone={row.inspectionOverdue ? 'danger' : 'warning'}>
            Check {dueText(row.inspectBy)}
          </Badge>
        )}
        {row.result && (
          <Badge tone={OUTCOME_TONES[row.result.outcome]}>
            {OUTCOME_LABELS[row.result.outcome]}
          </Badge>
        )}
      </div>

      <ul className="space-y-1">
        {row.lines.map((line) => (
          <li key={line.lineNo}>
            {line.productName} · {line.packLabel} · {line.boxes} boxes ({line.unitsPerBox} per box)
            <span className="block text-xs text-slate-500">
              Expected batch {line.batchDeclared ?? line.batchNumber ?? 'not given'}, expiry{' '}
              {line.expiryDeclared ?? line.expiryMonth}
              {line.shortExpiryAgreed ? ' (short expiry agreed)' : ''}
            </span>
          </li>
        ))}
      </ul>

      {row.leg1 && (
        <p className="text-slate-700">
          {leg1Text(row.leg1)} · dispatched {row.leg1.dispatchedOn} ·{' '}
          {FREIGHT_TERM_LABELS[row.leg1.freightTerms]}
          {row.leg1.note && row.leg1.mode !== 'DEPOT' ? ` · ${row.leg1.note}` : ''}
        </p>
      )}
      {row.arrival && (
        <p className="text-slate-700">
          Arrived {formatDateTime(row.arrival.arrivedAt)} · {row.arrival.boxesCounted} boxes counted
          · {row.arrival.billWithGoods ? 'seller bill came with the goods' : 'no seller bill'}
        </p>
      )}
      {row.result && (
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p>
            {row.result.corrected ? 'Corrected' : 'Checked'} {formatDateTime(row.result.savedAt)}:{' '}
            {row.result.acceptedBoxes} of {row.boxes} accepted
            {row.result.note ? ` · ${row.result.note}` : ''}
          </p>
          {row.result.lines.map((line) => (
            <p key={line.lineNo} className="text-xs text-slate-600">
              Line {line.lineNo}: {line.boxesShort} short · {line.boxesDamaged} damaged ·{' '}
              {line.boxesLeaking} leaking · {line.boxesExcess} extra
              {line.batchDiffers ? ` · batch ${line.batchFound ?? ''} differs` : ''}
              {line.expiryDiffers ? ` · expiry ${line.expiryFound ?? ''} differs` : ''}
              {line.belowShelfLife ? ' · short shelf life' : ''}
            </p>
          ))}
          {row.returnNotes.length > 0 && (
            <p className="text-xs text-slate-600">
              Return notes:{' '}
              {row.returnNotes
                .map((note) => `${note.number} (${boxesText(note.boxes)})`)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      <ErrorAlert message={notice} />
      {canAct && !open && row.status === 'DISPATCHED' && (
        <Button size="sm" onClick={() => setOpen(true)}>
          Goods arrived
        </Button>
      )}
      {canAct && !open && row.status === 'ARRIVED' && (
        <Button size="sm" onClick={() => setOpen(true)}>
          Check the goods
        </Button>
      )}
      {canAct && !open && row.status === 'CHECKED' && row.correctionBlock === null && (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Correct the check
        </Button>
      )}
      {row.result && row.correctionBlock && (
        <p className="text-xs text-slate-500">{row.correctionBlock}</p>
      )}
      {!canAct && (row.status === 'DISPATCHED' || row.status === 'ARRIVED') && (
        <p className="text-xs text-slate-500">Logistics does this.</p>
      )}
      {open && row.status === 'DISPATCHED' && (
        <ArrivalForm
          ordered={row.boxes}
          pending={arrival.isPending}
          error={arrival.error?.message}
          onSave={(input) =>
            arrival.mutateAsync({ row, arrival: input }).then(
              () => setOpen(false),
              (error: unknown) => {
                onError(error);
                throw error;
              },
            )
          }
          onCancel={() => setOpen(false)}
        />
      )}
      {open && row.status === 'ARRIVED' && row.arrival && (
        <InspectionForm
          lines={row.lines}
          boxesCounted={row.arrival.boxesCounted}
          pending={inspect.isPending}
          error={inspect.error?.message}
          onSave={(input) =>
            inspect.mutateAsync({ row, inspection: input }).then(
              () => setOpen(false),
              (error: unknown) => {
                onError(error);
                throw error;
              },
            )
          }
          onCancel={() => setOpen(false)}
        />
      )}
      {open && row.status === 'CHECKED' && row.arrival && row.result && (
        <InspectionForm
          lines={row.lines}
          boxesCounted={row.arrival.boxesCounted}
          earlier={row.result.lines}
          pending={correct.isPending}
          error={correct.error?.message}
          onSave={(input) =>
            correct.mutateAsync({ row, inspection: input }).then(
              () => setOpen(false),
              (error: unknown) => {
                onError(error);
                throw error;
              },
            )
          }
          onCancel={() => setOpen(false)}
        />
      )}
    </li>
  );
}

/**
 * The Indore dock (Logistics; LOCK-40 Part A). Coming: dispatched by the seller, not here yet (red after 4 days
 * on the road). Arrived: counted in, to be checked within a day. Checked: done. No firm names or money here.
 * "Goods arrived", "Check the goods" and (Build 9) "Correct the check" press engine actions, as the deal card does.
 */
export function DockPage() {
  const [lane, setLane] = useState<DockLane>('COMING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const dock = useDock({ lane, q, page, pageSize: PAGE_SIZE });
  // The Controller only looks (Q-ROL-01); Logistics, Founder and Admin may press.
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';
  const current = LANES.find((item) => item.lane === lane)!;

  return (
    <PageLayout
      title="Dock"
      description="Goods coming to the Indore dock: record each arrival, then check the boxes line by line."
    >
      <div className="flex flex-wrap gap-2">
        {LANES.map((item) => (
          <Button
            key={item.lane}
            size="sm"
            variant={lane === item.lane ? 'primary' : 'secondary'}
            aria-pressed={lane === item.lane}
            onClick={() => {
              setLane(item.lane);
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
        searchPlaceholder="Search by PO number"
        searchLabel="Search the dock"
      />
      {dock.isPending && <Spinner label="Loading the dock" className="h-6 w-6 text-brand-600" />}
      {dock.isError && (
        <ErrorState title="Could not load the dock" message={dock.error.message}>
          <Button onClick={() => void dock.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {dock.isSuccess && (
        <>
          {dock.data.rows.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {current.empty}
            </p>
          ) : (
            <ul className="space-y-3">
              {dock.data.rows.map((row) => (
                <DockCard key={`${row.purchaseOrderId}-${row.status}`} row={row} canAct={canAct} />
              ))}
            </ul>
          )}
          <Pagination
            page={dock.data.page}
            pageSize={dock.data.pageSize}
            total={dock.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
