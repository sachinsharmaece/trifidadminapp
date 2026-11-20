import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { Sku } from './api';
import { useUpdateSku } from './hooks';

interface PacksTableProps {
  skus: readonly Sku[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (sku: Sku) => void;
}

export function PacksTable({ skus, canEdit, onEdit }: PacksTableProps) {
  const update = useUpdateSku();

  function toggleActive(sku: Sku) {
    if (sku.active && !window.confirm(`Turn off the ${sku.packLabel} pack?`)) return;
    update.mutate({ id: sku.id, changes: { active: !sku.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Pack</th>
              <th className="px-4 py-3 font-medium">Units per box</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {skus.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                  This product has no packs.
                </td>
              </tr>
            )}
            {skus.map((sku) => (
              <tr key={sku.id} className={sku.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3 font-medium text-slate-900">{sku.packLabel}</td>
                <td className="px-4 py-3">{sku.unitsPerBox}</td>
                <td className="px-4 py-3">{sku.skuClass}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={sku.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(sku)}>
                        Edit
                      </Button>
                      <Button
                        variant={sku.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(sku)}
                        loading={update.isPending && update.variables.id === sku.id}
                      >
                        {sku.active ? 'Turn off' : 'Turn on'}
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
