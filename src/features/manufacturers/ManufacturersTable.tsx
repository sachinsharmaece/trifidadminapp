import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { Manufacturer } from './api';
import { useUpdateManufacturer } from './hooks';

interface ManufacturersTableProps {
  manufacturers: readonly Manufacturer[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (manufacturer: Manufacturer) => void;
}

export function ManufacturersTable({ manufacturers, canEdit, onEdit }: ManufacturersTableProps) {
  const update = useUpdateManufacturer();

  function toggleActive(manufacturer: Manufacturer) {
    if (
      manufacturer.active &&
      !window.confirm(
        `Turn off ${manufacturer.name}? It will no longer appear when adding products.`,
      )
    ) {
      return;
    }
    update.mutate({ id: manufacturer.id, changes: { active: !manufacturer.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {manufacturers.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 3 : 2} className="px-4 py-8 text-center text-slate-500">
                  No manufacturers found.
                </td>
              </tr>
            )}
            {manufacturers.map((manufacturer) => (
              <tr key={manufacturer.id} className={manufacturer.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3 font-medium text-slate-900">{manufacturer.name}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={manufacturer.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(manufacturer)}>
                        Rename
                      </Button>
                      <Button
                        variant={manufacturer.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(manufacturer)}
                        loading={update.isPending && update.variables.id === manufacturer.id}
                      >
                        {manufacturer.active ? 'Turn off' : 'Turn on'}
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
