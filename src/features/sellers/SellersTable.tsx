import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { maskedAccount } from '@/utils/format';
import type { Seller } from './api';
import { useUpdateSeller } from './hooks';

interface SellersTableProps {
  sellers: readonly Seller[];
  onEdit: (seller: Seller) => void;
}

export function SellersTable({ sellers, onEdit }: SellersTableProps) {
  const update = useUpdateSeller();

  function toggleActive(seller: Seller) {
    if (seller.active && !window.confirm(`Turn off ${seller.number} ${seller.firmName}?`)) return;
    update.mutate({ id: seller.id, changes: { active: !seller.active } });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={update.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Firm</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Tehsil</th>
              <th className="px-4 py-3 font-medium">Cut-off</th>
              <th className="px-4 py-3 font-medium">Bank account</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No sellers found.
                </td>
              </tr>
            )}
            {sellers.map((seller) => (
              <tr key={seller.id} className={seller.active ? '' : 'text-slate-500'}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {seller.number}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{seller.firmName}</div>
                  <div className="text-xs text-slate-500">{seller.gstin}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{seller.mobile}</div>
                  {seller.contactName && (
                    <div className="text-xs text-slate-500">{seller.contactName}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{seller.tehsil.name}</div>
                  <div className="text-xs text-slate-500">{seller.tehsil.district}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{seller.dispatchCutoff}</td>
                <td className="px-4 py-3">
                  <div className="whitespace-nowrap">{maskedAccount(seller.bank.accountLast4)}</div>
                  <div className="text-xs text-slate-500">
                    {seller.bank.ifsc} · {seller.bank.bankName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ActiveBadge active={seller.active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Button variant="secondary" size="sm" onClick={() => onEdit(seller)}>
                      Edit
                    </Button>
                    <Button
                      variant={seller.active ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => toggleActive(seller)}
                      loading={update.isPending && update.variables.id === seller.id}
                    >
                      {seller.active ? 'Turn off' : 'Turn on'}
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
