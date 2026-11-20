import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { HsnCode } from '@/features/hsnCodes/api';
import { useHsnCodes } from '@/features/hsnCodes/hooks';
import { HsnCodeForm } from '@/features/hsnCodes/HsnCodeForm';
import { HsnCodesTable } from '@/features/hsnCodes/HsnCodesTable';

/** Tax classification codes. Each one has a GST rate that new products start from. */
export function HsnCodesPage() {
  const hsnCodes = useHsnCodes();
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  // 'new' = the add form is open; an HSN code = editing it; null = no form.
  const [editing, setEditing] = useState<HsnCode | 'new' | null>(null);

  const text = search.trim().toLowerCase();
  const shown = hsnCodes.data?.filter(
    (hsnCode) => hsnCode.code.includes(text) || hsnCode.description.toLowerCase().includes(text),
  );

  return (
    <PageLayout
      title="HSN codes"
      description="Tax classification codes and their GST rates."
      actions={
        canEdit &&
        editing === null && <Button onClick={() => setEditing('new')}>Add HSN code</Button>
      }
    >
      {editing !== null && (
        <HsnCodeForm
          key={editing === 'new' ? 'new' : editing.id}
          hsnCode={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search HSN codes"
      />

      {hsnCodes.isPending && (
        <Spinner label="Loading HSN codes" className="h-6 w-6 text-brand-600" />
      )}
      {hsnCodes.isError && (
        <ErrorState title="Could not load HSN codes" message={hsnCodes.error.message}>
          <Button onClick={() => void hsnCodes.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {shown && <HsnCodesTable hsnCodes={shown} canEdit={canEdit} onEdit={setEditing} />}
    </PageLayout>
  );
}
