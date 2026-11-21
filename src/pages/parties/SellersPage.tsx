import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import type { Seller } from '@/features/sellers/api';
import { SellerForm } from '@/features/sellers/SellerForm';
import { useSellers } from '@/features/sellers/hooks';
import { SellersTable } from '@/features/sellers/SellersTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 25;

/** The firms we buy from. The server searches and pages, so this stays fast with thousands of rows. */
export function SellersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // 'new' = the add form is open; a seller = editing it; null = no form.
  const [editing, setEditing] = useState<Seller | 'new' | null>(null);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const sellers = useSellers({ q, page, pageSize: PAGE_SIZE });

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout
      title="Sellers"
      description="The firms we buy from."
      actions={editing === null && <Button onClick={() => setEditing('new')}>Add seller</Button>}
    >
      {editing !== null && (
        <SellerForm
          key={editing === 'new' ? 'new' : editing.id}
          seller={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={changeSearch}
        searchPlaceholder="Search by number, firm, contact, mobile or GSTIN"
        searchLabel="Search sellers"
      />

      {sellers.isPending && <Spinner label="Loading sellers" className="h-6 w-6 text-brand-600" />}
      {sellers.isError && (
        <ErrorState title="Could not load sellers" message={sellers.error.message}>
          <Button onClick={() => void sellers.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {sellers.isSuccess && (
        <>
          <SellersTable sellers={sellers.data.sellers} onEdit={setEditing} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={sellers.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
