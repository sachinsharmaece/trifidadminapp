import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { Tehsil } from '@/features/tehsils/api';
import { useTehsils } from '@/features/tehsils/hooks';
import { TehsilForm } from '@/features/tehsils/TehsilForm';
import { TehsilsTable } from '@/features/tehsils/TehsilsTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 25;

/** Sub-district areas that buyers and sellers are placed in. There can be thousands, so the server searches and pages. */
export function TehsilsPage() {
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // 'new' = the add form is open; a tehsil = editing it; null = no form.
  const [editing, setEditing] = useState<Tehsil | 'new' | null>(null);
  // Wait until typing pauses before asking the server.
  const q = useDebouncedValue(search.trim());
  const tehsils = useTehsils({ q, page, pageSize: PAGE_SIZE });

  function changeSearch(text: string) {
    setSearch(text);
    setPage(1); // a new search starts from the first page
  }

  return (
    <PageLayout
      title="Tehsils"
      description="Sub-district areas, with the pincodes they cover."
      actions={
        canEdit && editing === null && <Button onClick={() => setEditing('new')}>Add tehsil</Button>
      }
    >
      {editing !== null && (
        <TehsilForm
          key={editing === 'new' ? 'new' : editing.id}
          tehsil={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={changeSearch}
        searchPlaceholder="Search by name, district, state or pincode"
        searchLabel="Search tehsils"
      />

      {tehsils.isPending && <Spinner label="Loading tehsils" className="h-6 w-6 text-brand-600" />}
      {tehsils.isError && (
        <ErrorState title="Could not load tehsils" message={tehsils.error.message}>
          <Button onClick={() => void tehsils.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {tehsils.isSuccess && (
        <>
          <TehsilsTable tehsils={tehsils.data.tehsils} canEdit={canEdit} onEdit={setEditing} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={tehsils.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
