import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { ComplaintCard } from '@/features/complaints/ComplaintCard';
import { useComplaints, useRunClocks } from '@/features/complaints/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_LABELS,
  type ComplaintStatus,
} from '@/types/complaint';

const PAGE_SIZE = 20;

/**
 * Complaints from buyers (Sales side of the wall). Sales raises one from the deal card inside the 7-day delivery
 * window; the Controller (and Founder or Admin) decides here or on the card. A refund decided here waits in
 * Payouts. "Run delivery clock now" marks trades whose window passed in silence as delivered, without waiting
 * for the server's own 15-minute check.
 */
export function ComplaintsPage() {
  const [status, setStatus] = useState<ComplaintStatus>('OPEN');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const complaints = useComplaints({ status, q, page, pageSize: PAGE_SIZE });
  const { data: me } = useCurrentUser();
  const canDecide = me?.role === 'CONTROLLER' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';
  const clocks = useRunClocks();

  return (
    <PageLayout
      title="Complaints"
      description="Buyers who say something is wrong, within 7 days of the proof of dispatch. The Controller decides within 48 hours."
      actions={
        canDecide ? (
          <Button variant="secondary" loading={clocks.isPending} onClick={() => clocks.mutate()}>
            Run delivery clock now
          </Button>
        ) : undefined
      }
    >
      {clocks.isSuccess && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {clocks.data.delivered === 0
            ? 'Clock run: no trade was waiting.'
            : `Clock run: ${clocks.data.delivered} trade${clocks.data.delivered === 1 ? '' : 's'} marked delivered (no complaint came in 7 days).`}
        </p>
      )}
      <ErrorAlert message={clocks.error?.message} />

      <div className="flex gap-2" role="group" aria-label="Complaints view">
        {COMPLAINT_STATUSES.map((value) => (
          <Button
            key={value}
            variant={status === value ? 'primary' : 'secondary'}
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {COMPLAINT_STATUS_LABELS[value]}
            {complaints.data ? ` (${complaints.data.counts[value]})` : ''}
          </Button>
        ))}
      </div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Search by complaint no. or buyer"
        searchLabel="Search complaints"
      />

      {complaints.isPending && (
        <Spinner label="Loading complaints" className="h-6 w-6 text-brand-600" />
      )}
      {complaints.isError && (
        <ErrorState title="Could not load the complaints" message={complaints.error.message}>
          <Button onClick={() => void complaints.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {complaints.isSuccess && (
        <>
          {complaints.data.complaints.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {status === 'OPEN' ? 'No open complaints.' : 'No decided complaints yet.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {complaints.data.complaints.map((row) => (
                <ComplaintCard key={row.id} row={row} canDecide={canDecide} />
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={complaints.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
