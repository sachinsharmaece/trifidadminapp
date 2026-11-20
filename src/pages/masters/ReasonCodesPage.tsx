import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { ReasonCode } from '@/features/reasonCodes/api';
import { useReasonCodes } from '@/features/reasonCodes/hooks';
import { ReasonCodeForm } from '@/features/reasonCodes/ReasonCodeForm';
import { ReasonCodesTable } from '@/features/reasonCodes/ReasonCodesTable';
import { CONTEXT_LABELS, REASON_CODE_CONTEXTS } from '@/types/reasonCode';

/** The reasons staff pick from dropdowns (buyer said no, refund, cancelled...). Each is offered only in its own context. */
export function ReasonCodesPage() {
  const reasonCodes = useReasonCodes();
  const canEdit = useCanEditMasters();
  const [search, setSearch] = useState('');
  const [context, setContext] = useState(''); // '' = all contexts
  // 'new' = the add form is open; a reason code = editing it; null = no form.
  const [editing, setEditing] = useState<ReasonCode | 'new' | null>(null);

  // There are dozens of reason codes, not thousands, so filtering happens in the browser.
  const text = search.trim().toLowerCase();
  const shown = reasonCodes.data?.filter(
    (reasonCode) =>
      (context === '' || reasonCode.context === context) &&
      (reasonCode.label.toLowerCase().includes(text) ||
        reasonCode.code.toLowerCase().includes(text)),
  );

  return (
    <PageLayout
      title="Reason codes"
      description="The reasons staff choose from dropdowns. Each one appears only where it is used."
      actions={
        canEdit &&
        editing === null && <Button onClick={() => setEditing('new')}>Add reason code</Button>
      }
    >
      {editing !== null && (
        <ReasonCodeForm
          key={editing === 'new' ? 'new' : editing.id}
          reasonCode={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reason codes"
      >
        <Select
          aria-label="Show reasons used for"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          className="w-56"
        >
          <option value="">All contexts</option>
          {REASON_CODE_CONTEXTS.map((item) => (
            <option key={item} value={item}>
              {CONTEXT_LABELS[item]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>

      {reasonCodes.isPending && (
        <Spinner label="Loading reason codes" className="h-6 w-6 text-brand-600" />
      )}
      {reasonCodes.isError && (
        <ErrorState title="Could not load reason codes" message={reasonCodes.error.message}>
          <Button onClick={() => void reasonCodes.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {shown && <ReasonCodesTable reasonCodes={shown} canEdit={canEdit} onEdit={setEditing} />}
    </PageLayout>
  );
}
