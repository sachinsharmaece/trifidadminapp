import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { Tehsil } from './api';
import { useUpdateTehsil } from './hooks';

interface TehsilsTableProps {
  tehsils: readonly Tehsil[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (tehsil: Tehsil) => void;
}

export function TehsilsTable({ tehsils, canEdit, onEdit }: TehsilsTableProps) {
  const update = useUpdateTehsil();

  function toggleActive(tehsil: Tehsil) {
    if (tehsil.active && !window.confirm(`Turn off ${tehsil.name}, ${tehsil.district}?`)) return;
    update.mutate({ id: tehsil.id, changes: { active: !tehsil.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tehsil</th>
              <th className="px-4 py-3 font-medium">District</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Pincodes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tehsils.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                  No tehsils found.
                </td>
              </tr>
            )}
            {tehsils.map((tehsil) => (
              <tr key={tehsil.id} className={tehsil.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3 font-medium text-slate-900">{tehsil.name}</td>
                <td className="px-4 py-3">{tehsil.district}</td>
                <td className="px-4 py-3">{tehsil.state}</td>
                <td className="px-4 py-3">{tehsil.pincodes.join(', ')}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={tehsil.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(tehsil)}>
                        Edit
                      </Button>
                      <Button
                        variant={tehsil.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(tehsil)}
                        loading={update.isPending && update.variables.id === tehsil.id}
                      >
                        {tehsil.active ? 'Turn off' : 'Turn on'}
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
