import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { CONTEXT_LABELS } from '@/types/reasonCode';
import type { ReasonCode } from './api';
import { useUpdateReasonCode } from './hooks';

interface ReasonCodesTableProps {
  reasonCodes: readonly ReasonCode[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (reasonCode: ReasonCode) => void;
}

export function ReasonCodesTable({ reasonCodes, canEdit, onEdit }: ReasonCodesTableProps) {
  const update = useUpdateReasonCode();

  function toggleActive(reasonCode: ReasonCode) {
    if (
      reasonCode.active &&
      !window.confirm(`Turn off "${reasonCode.label}"? It will no longer appear in its dropdown.`)
    ) {
      return;
    }
    update.mutate({ id: reasonCode.id, changes: { active: !reasonCode.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Used for</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reasonCodes.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                  No reason codes found.
                </td>
              </tr>
            )}
            {reasonCodes.map((reasonCode) => (
              <tr key={reasonCode.id} className={reasonCode.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3">{CONTEXT_LABELS[reasonCode.context]}</td>
                <td className="px-4 py-3 font-mono text-xs">{reasonCode.code}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{reasonCode.label}</td>
                <td className="px-4 py-3">{reasonCode.sort}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={reasonCode.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(reasonCode)}>
                        Edit
                      </Button>
                      <Button
                        variant={reasonCode.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(reasonCode)}
                        loading={update.isPending && update.variables.id === reasonCode.id}
                      >
                        {reasonCode.active ? 'Turn off' : 'Turn on'}
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
