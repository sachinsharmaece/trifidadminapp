import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { ComplaintCard } from '@/features/complaints/ComplaintCard';
import { useComplaints } from '@/features/complaints/hooks';
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
 * Payouts. (The delivery clock's "Run now" button is on the Today page.)
 */
export function ComplaintsPage() {
  const [status, setStatus] = useState<ComplaintStatus>('OPEN');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const complaints = useComplaints({ status, q, page, pageSize: PAGE_SIZE });
  const { data: me } = useCurrentUser();
  const canDecide = me?.role === 'CONTROLLER' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  return (
    <PageLayout
      title="Complaints"
      description="Buyers who say something is wrong, within 7 days of the proof of dispatch. The Controller decides within 48 hours."
    >
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
