import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { RATE_TIER_LABELS } from '@/types/party';
import type { Buyer } from './api';
import { useClassifyBuyer, useUpdateBuyer } from './hooks';

interface BuyersTableProps {
  buyers: readonly Buyer[];
  onEdit: (buyer: Buyer) => void;
}

export function BuyersTable({ buyers, onEdit }: BuyersTableProps) {
  const update = useUpdateBuyer();
  const classify = useClassifyBuyer();

  function toggleActive(buyer: Buyer) {
    if (buyer.active && !window.confirm(`Turn off ${buyer.number} ${buyer.firmName}?`)) return;
    update.mutate({ id: buyer.id, changes: { active: !buyer.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message ?? classify.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Firm</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Tehsil</th>
              <th className="px-4 py-3 font-medium">Rate tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {buyers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No buyers found.
                </td>
              </tr>
            )}
            {buyers.map((buyer) => (
              <tr key={buyer.id} className={buyer.active ? '' : 'text-slate-500'}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {buyer.number}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{buyer.firmName}</div>
                  <div className="text-xs text-slate-500">
                    {buyer.gstin || 'No GSTIN (consumer)'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{buyer.contactName}</div>
                  <div className="text-xs text-slate-500">{buyer.mobiles.join(', ')}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{buyer.tehsil.name}</div>
                  <div className="text-xs text-slate-500">{buyer.tehsil.district}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={buyer.rateTier === 'TRADER' ? 'info' : 'neutral'}>
                      {RATE_TIER_LABELS[buyer.rateTier]}
                    </Badge>
                    {!buyer.classified && (
                      <Badge
                        tone="warning"
                        title="Not confirmed yet. Use Classify now to confirm this tier."
                      >
                        Indicative
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ActiveBadge active={buyer.active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    {!buyer.classified && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => classify.mutate(buyer.id)}
                        loading={classify.isPending && classify.variables === buyer.id}
                      >
                        Classify now
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => onEdit(buyer)}>
                      Edit
                    </Button>
                    <Button
                      variant={buyer.active ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => toggleActive(buyer)}
                      loading={update.isPending && update.variables.id === buyer.id}
                    >
                      {buyer.active ? 'Turn off' : 'Turn on'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
