import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { ListingForm } from '@/features/listings/ListingForm';
import { ListingsTable } from '@/features/listings/ListingsTable';
import { useListings } from '@/features/listings/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { LISTING_STATUSES, LISTING_STATUS_LABELS, type ListingStatus } from '@/types/listing';

const PAGE_SIZE = 25;

/** The offers sellers have made, newest first. A listing lives 45 days unless it is paused or withdrawn. */
export function ListingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListingStatus | ''>('ACTIVE');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const listings = useListings({ q, page, pageSize: PAGE_SIZE, status: status || undefined });

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout
      title="Listings"
      description="What our sellers are offering, and at what rate."
      actions={!adding && <Button onClick={() => setAdding(true)}>Add listing</Button>}
    >
      {adding && <ListingForm onDone={() => setAdding(false)} />}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={changeSearch}
        searchPlaceholder="Search by seller or product"
        searchLabel="Search listings"
      >
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ListingStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {LISTING_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>

      {listings.isPending && (
        <Spinner label="Loading listings" className="h-6 w-6 text-brand-600" />
      )}
      {listings.isError && (
        <ErrorState title="Could not load listings" message={listings.error.message}>
          <Button onClick={() => void listings.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {listings.isSuccess && (
        <>
          <ListingsTable listings={listings.data.listings} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={listings.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
