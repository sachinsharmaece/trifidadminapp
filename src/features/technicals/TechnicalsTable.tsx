import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { Technical } from './api';
import { useUpdateTechnical } from './hooks';

interface TechnicalsTableProps {
  technicals: readonly Technical[];
  /** False for people who may only look: the action buttons are hidden. */
  canEdit: boolean;
  onEdit: (technical: Technical) => void;
}

export function TechnicalsTable({ technicals, canEdit, onEdit }: TechnicalsTableProps) {
  const update = useUpdateTechnical();

  function toggleActive(technical: Technical) {
    if (
      technical.active &&
      !window.confirm(`Turn off ${technical.name}? It will no longer appear when adding products.`)
    ) {
      return;
    }
    update.mutate({ id: technical.id, changes: { active: !technical.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {technicals.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center text-slate-500">
                  No technicals found.
                </td>
              </tr>
            )}
            {technicals.map((technical) => (
              <tr key={technical.id} className={technical.active ? '' : 'text-slate-500'}>
                <td className="px-4 py-3 font-medium text-slate-900">{technical.name}</td>
                <td className="px-4 py-3">{technical.description}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={technical.active} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(technical)}>
                        Edit
                      </Button>
                      <Button
                        variant={technical.active ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(technical)}
                        loading={update.isPending && update.variables.id === technical.id}
                      >
                        {technical.active ? 'Turn off' : 'Turn on'}
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
