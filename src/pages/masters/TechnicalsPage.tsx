import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { Technical } from '@/features/technicals/api';
import { useTechnicals } from '@/features/technicals/hooks';
import { TechnicalForm } from '@/features/technicals/TechnicalForm';
import { TechnicalsTable } from '@/features/technicals/TechnicalsTable';

/** The active ingredient / formulation of a product, like "Imidacloprid 17.8% SL". */
export function TechnicalsPage() {
  const technicals = useTechnicals();
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  // 'new' = the add form is open; a technical = editing it; null = no form.
  const [editing, setEditing] = useState<Technical | 'new' | null>(null);

  const text = search.trim().toLowerCase();
  const shown = technicals.data?.filter(
    (technical) =>
      technical.name.toLowerCase().includes(text) ||
      technical.description.toLowerCase().includes(text),
  );

  return (
    <PageLayout
      title="Technicals"
      description="The active ingredient of each product, shared by every brand that uses it."
      actions={
        canEdit &&
        editing === null && <Button onClick={() => setEditing('new')}>Add technical</Button>
      }
    >
      {editing !== null && (
        <TechnicalForm
          key={editing === 'new' ? 'new' : editing.id}
          technical={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search technicals"
      />

      {technicals.isPending && (
        <Spinner label="Loading technicals" className="h-6 w-6 text-brand-600" />
      )}
      {technicals.isError && (
        <ErrorState title="Could not load technicals" message={technicals.error.message}>
          <Button onClick={() => void technicals.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {shown && <TechnicalsTable technicals={shown} canEdit={canEdit} onEdit={setEditing} />}
    </PageLayout>
  );
}
