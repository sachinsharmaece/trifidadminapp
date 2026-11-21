import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import type { Buyer } from '@/features/buyers/api';
import { BuyerForm } from '@/features/buyers/BuyerForm';
import { useBuyers } from '@/features/buyers/hooks';
import { BuyersTable } from '@/features/buyers/BuyersTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 25;

/** The firms and customers we sell to. The server searches and pages, so this stays fast with thousands of rows. */
export function BuyersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // 'new' = the add form is open; a buyer = editing it; null = no form.
  const [editing, setEditing] = useState<Buyer | 'new' | null>(null);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const buyers = useBuyers({ q, page, pageSize: PAGE_SIZE });

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout
      title="Buyers"
      description="The firms and customers we sell to."
      actions={editing === null && <Button onClick={() => setEditing('new')}>Add buyer</Button>}
    >
      {editing !== null && (
        <BuyerForm
          key={editing === 'new' ? 'new' : editing.id}
          buyer={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={changeSearch}
        searchPlaceholder="Search by number, firm, contact, mobile or GSTIN"
        searchLabel="Search buyers"
      />

      {buyers.isPending && <Spinner label="Loading buyers" className="h-6 w-6 text-brand-600" />}
      {buyers.isError && (
        <ErrorState title="Could not load buyers" message={buyers.error.message}>
          <Button onClick={() => void buyers.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {buyers.isSuccess && (
        <>
          <BuyersTable buyers={buyers.data.buyers} onEdit={setEditing} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={buyers.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
