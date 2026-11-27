import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import type { LostRow } from '@/features/today/api';
import { useRunClocks, useToday } from '@/features/today/hooks';
import { LostInTransitForm } from '@/features/trades/controllerActionForms';
import { dueText, formatDateTime } from '@/utils/format';

/**
 * The Controller's Today page (Controller, Founder and Admin). It lists what has run past its time. The clocks only
 * SHOW these, nobody is acted on automatically: the desk named does its job, or the Controller steps in. Two clocks
 * do act by themselves (a b9 trade with no complaint is delivered, an untouched viewing is archived), and
 * "Run the clocks now" runs them without waiting for the server's 15-minute check.
 */
export function TodayPage() {
  const today = useToday();
  const clocks = useRunClocks();

  return (
    <PageLayout
      title="Today"
      description="What has run past its time. These only show here: the desk named does its job, or you step in."
      actions={
        <Button variant="secondary" loading={clocks.isPending} onClick={() => clocks.mutate()}>
          Run the clocks now
        </Button>
      }
    >
      {clocks.isSuccess && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {`Clocks run: ${clocks.data.delivered} trade${clocks.data.delivered === 1 ? '' : 's'} marked delivered, ${clocks.data.archived} viewing${clocks.data.archived === 1 ? '' : 's'} archived.`}
        </p>
      )}
      <ErrorAlert message={clocks.error?.message} />

      {today.isPending && <Spinner label="Loading today" className="h-6 w-6 text-brand-600" />}
      {today.isError && (
        <ErrorState title="Could not load this page" message={today.error.message}>
          <Button onClick={() => void today.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {today.isSuccess && (
        <>
          <section aria-labelledby="today-lost" className="space-y-3">
            <h2 id="today-lost" className="text-lg font-semibold">
              Goods that should have arrived ({today.data.lostInTransit.length})
            </h2>
            <p className="text-sm text-slate-600">
              Dispatched, and still not at the Indore dock after the time allowed. If the goods are
              really gone, close the deal as lost: the buyer is refunded in full and the seller gets
              a strike.
            </p>
            {today.data.lostInTransit.length === 0 ? (
              <Empty>No shipment is overdue.</Empty>
            ) : (
              <ul aria-label="Overdue shipments" className="space-y-3">
                {today.data.lostInTransit.map((row) => (
                  <LostRowCard key={row.trade.id} row={row} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="today-complaints" className="space-y-3">
            <h2 id="today-complaints" className="text-lg font-semibold">
              Complaints
            </h2>
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              {today.data.complaints.open === 0 ? (
                'No open complaints.'
              ) : (
                <>
                  <strong>{today.data.complaints.open}</strong> open
                  {today.data.complaints.overdue > 0 && (
                    <>
                      , <strong>{today.data.complaints.overdue}</strong> past the 48-hour limit
                    </>
                  )}
                  .{' '}
                </>
              )}
              <Link to="/complaints" className="text-brand-700 hover:underline">
                Open the complaints list
              </Link>
            </p>
          </section>

          <section aria-labelledby="today-overdue" className="space-y-3">
            <h2 id="today-overdue" className="text-lg font-semibold">
              Other clocks that ran out ({today.data.overdue.length})
            </h2>
            {today.data.overdue.length === 0 ? (
              <Empty>Nothing else is overdue.</Empty>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm" aria-label="Overdue deals">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Deal</th>
                      <th className="px-4 py-3 font-medium">Waiting for</th>
                      <th className="px-4 py-3 font-medium">Desk</th>
                      <th className="px-4 py-3 font-medium">Parties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {today.data.overdue.map((row) => (
                      <tr key={row.trade.id}>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            to={`/trades/${row.trade.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {row.trade.number}
                          </Link>
                          <div className="text-xs text-slate-500">{row.stage}</div>
                        </td>
                        <td className="px-4 py-3">
                          {row.label}
                          <div className="text-xs text-red-700">{dueText(row.dueAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={row.desk === 'The clock' ? 'neutral' : 'warning'}>
                            {row.desk}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div>Buyer: {row.buyer.firmName}</div>
                          {row.seller && <div>Seller: {row.seller.firmName}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-slate-500">
              An untouched b1 viewing is archived by the system after {today.data.archiveDays} days;
              open it again from the Rate board to keep it.
            </p>
          </section>

          <section aria-labelledby="today-held" className="space-y-3">
            <h2 id="today-held" className="text-lg font-semibold">
              Payouts on hold ({today.data.held.length})
            </h2>
            {today.data.held.length === 0 ? (
              <Empty>No seller payout is on hold.</Empty>
            ) : (
              <ul aria-label="Payouts on hold" className="space-y-3">
                {today.data.held.map((row) => (
                  <li
                    key={row.poNumber}
                    className="space-y-1 rounded-lg border border-slate-200 bg-white p-4 text-sm"
                  >
                    <div className="font-medium">
                      {row.poNumber} · {row.seller?.firmName ?? ''}
                    </div>
                    <div>
                      On hold: {row.reason}{' '}
                      <span className="text-xs text-slate-500">since {formatDateTime(row.at)}</span>
                    </div>
                    {row.trade && (
                      <Link
                        to={`/trades/${row.trade.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        Open {row.trade.number} to release the hold
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageLayout>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

/** One overdue shipment, with a "Close as lost" button that opens the same form as the deal card. */
function LostRowCard({ row }: { row: LostRow }) {
  const [closing, setClosing] = useState(false);
  // Set when someone else moved the trade first: the page reloads and shows what is now true.
  const [changedByOthers, setChangedByOthers] = useState(false);
  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <Link
            to={`/trades/${row.trade.id}`}
            className="font-medium text-brand-700 hover:underline"
          >
            {row.trade.number}
          </Link>
          <span className="text-slate-500">
            {' '}
            · {row.poNumber ?? 'no PO'}
            {row.boxes !== null ? ` · ${row.boxes} boxes` : ''}
          </span>
          <div className="text-xs text-slate-600">
            Buyer: {row.buyer.firmName}
            {row.seller ? ` · Seller: ${row.seller.firmName}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="danger">{dueText(row.dueAt)}</Badge>
          {!closing && (
            <Button
              variant="secondary"
              onClick={() => {
                setChangedByOthers(false);
                setClosing(true);
              }}
            >
              Close as lost
            </Button>
          )}
        </div>
      </div>
      <ErrorAlert
        message={
          changedByOthers
            ? 'Someone else acted on this trade first, so your change was not saved. The page now shows the latest.'
            : undefined
        }
      />
      {closing && (
        <LostInTransitForm
          trade={row.trade}
          dueAt={row.dueAt}
          owedPaise={null}
          onDone={() => setClosing(false)}
          onChangedByOthers={() => {
            setChangedByOthers(true);
            setClosing(false);
          }}
        />
      )}
    </li>
  );
}
