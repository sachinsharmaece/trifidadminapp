import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { Manufacturer } from '@/features/manufacturers/api';
import { useManufacturers } from '@/features/manufacturers/hooks';
import { ManufacturerForm } from '@/features/manufacturers/ManufacturerForm';
import { ManufacturersTable } from '@/features/manufacturers/ManufacturersTable';

/** Companies that make the products we sell. Everyone can look; Founder and Admin can change. */
export function ManufacturersPage() {
  const manufacturers = useManufacturers();
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  // 'new' = the add form is open; a manufacturer = renaming it; null = no form.
  const [editing, setEditing] = useState<Manufacturer | 'new' | null>(null);

  // A company has dozens of manufacturers, not thousands, so the search runs in the browser.
  const shown = manufacturers.data?.filter((manufacturer) =>
    manufacturer.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <PageLayout
      title="Manufacturers"
      description="The companies whose products we trade."
      actions={
        canEdit &&
        editing === null && <Button onClick={() => setEditing('new')}>Add manufacturer</Button>
      }
    >
      {editing !== null && (
        <ManufacturerForm
          // A new key gives a fresh form when you switch from one manufacturer to another.
          key={editing === 'new' ? 'new' : editing.id}
          manufacturer={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search manufacturers"
      />

      {manufacturers.isPending && (
        <Spinner label="Loading manufacturers" className="h-6 w-6 text-brand-600" />
      )}
      {manufacturers.isError && (
        <ErrorState title="Could not load manufacturers" message={manufacturers.error.message}>
          <Button onClick={() => void manufacturers.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {shown && <ManufacturersTable manufacturers={shown} canEdit={canEdit} onEdit={setEditing} />}
    </PageLayout>
  );
}
