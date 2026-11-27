import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  PAYOUT_BATCH_STATUS_LABELS,
  PAYOUT_BATCH_STATUSES,
  type PayoutBatchStatus,
} from '@/types/payouts';
import { BatchCard } from './BatchCard';
import { useBatches } from './hooks';

const PAGE_SIZE = 25;

/** The batches, newest first, by status: Draft (to release), Released (to prove) and Cancelled. */
export function BatchesTab({ canWrite, canRelease }: { canWrite: boolean; canRelease: boolean }) {
  const [status, setStatus] = useState<PayoutBatchStatus>('DRAFT');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const list = useBatches({ status, q, page, pageSize: PAGE_SIZE });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Batch number or payee"
        searchLabel="Search payout batches"
      >
        <Select
          aria-label="Show"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PayoutBatchStatus);
            setPage(1);
          }}
        >
          {PAYOUT_BATCH_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PAYOUT_BATCH_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>
      {list.isPending && <Spinner label="Loading batches" className="h-6 w-6 text-brand-600" />}
      {list.isError && (
        <ErrorState title="Could not load the batches" message={list.error.message}>
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {list.isSuccess && (
        <>
          {list.data.batches.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No batches here.
            </p>
          ) : (
            <ul className="space-y-3">
              {list.data.batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  canWrite={canWrite}
                  canRelease={canRelease}
                />
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
