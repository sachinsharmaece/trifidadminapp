import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { formatPercent } from '@/utils/format';
import type { HsnCode } from './api';
import { useUpdateHsnCode } from './hooks';

interface HsnCodesTableProps {
  hsnCodes: readonly HsnCode[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (hsnCode: HsnCode) => void;
}

export function HsnCodesTable({ hsnCodes, canEdit, onEdit }: HsnCodesTableProps) {
  const update = useUpdateHsnCode();

  function toggleActive(hsnCode: HsnCode) {
    if (
      hsnCode.active &&
      !window.confirm(
        `Turn off HSN code ${hsnCode.code}? It will no longer appear when adding products.`,
      )
    ) {
      return;
    }
    update.mutate({ id: hsnCode.id, changes: { active: !hsnCode.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">HSN code</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">GST</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hsnCodes.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                  No HSN codes found.
                </td>
              </tr>
            )}
            {hsnCodes.map((hsnCode) => (
              <tr key={hsnCode.id} className={hsnCode.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3 font-medium text-slate-900">{hsnCode.code}</td>
                <td className="px-4 py-3">{hsnCode.description}</td>
                <td className="px-4 py-3">{formatPercent(hsnCode.gstBp)}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={hsnCode.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(hsnCode)}>
                        Edit
                      </Button>
                      <Button
                        variant={hsnCode.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(hsnCode)}
                        loading={update.isPending && update.variables.id === hsnCode.id}
                      >
                        {hsnCode.active ? 'Turn off' : 'Turn on'}
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
