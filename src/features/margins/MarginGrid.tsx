import { Button } from '@/components/atoms/Button';
import { RATE_TIER_LABELS } from '@/types/party';
import { BUYER_TIERS, type BuyerTier } from '@/types/margin';
import { SKU_CLASSES, type SkuClass } from '@/types/product';
import { formatDate, formatPercent } from '@/utils/format';
import type { MarginCell } from './api';

interface MarginGridProps {
  cells: readonly MarginCell[];
  /** False for people who may only look: the margins are plain text, not buttons. */
  canEdit: boolean;
  /** Called with the class and tier of the box that was clicked. */
  onChange: (skuClass: SkuClass, buyerTier: BuyerTier) => void;
}

/** The matrix at a glance: one box for every pack class and buyer tier, showing the margin in use now. */
export function MarginGrid({ cells, canEdit, onChange }: MarginGridProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Pack class</th>
            {BUYER_TIERS.map((tier) => (
              <th key={tier} className="px-4 py-3 font-medium">
                {RATE_TIER_LABELS[tier]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {SKU_CLASSES.map((skuClass) => (
            <tr key={skuClass}>
              <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                Class {skuClass}
              </th>
              {BUYER_TIERS.map((tier) => {
                const pair = cells.filter((c) => c.skuClass === skuClass && c.buyerTier === tier);
                const current = pair.find((c) => c.status === 'CURRENT');
                // The server lists the newest first, so the last scheduled one starts soonest.
                const next = pair.filter((c) => c.status === 'SCHEDULED').at(-1);
                return (
                  <td key={tier} className="px-4 py-3 align-top">
                    {current ? (
                      <div>
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 text-base font-semibold"
                            aria-label={`Change the margin for class ${skuClass}, ${RATE_TIER_LABELS[tier]}`}
                            onClick={() => onChange(skuClass, tier)}
                          >
                            {formatPercent(current.marginBp)}
                          </Button>
                        ) : (
                          <div className="text-base font-semibold text-slate-900">
                            {formatPercent(current.marginBp)}
                          </div>
                        )}
                        <div className="text-xs text-slate-500">
                          since {formatDate(current.effectiveFrom)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="font-medium text-amber-700"
                          title="Rate unavailable: margin cell missing"
                        >
                          Not set
                        </div>
                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-1"
                            aria-label={`Set the margin for class ${skuClass}, ${RATE_TIER_LABELS[tier]}`}
                            onClick={() => onChange(skuClass, tier)}
                          >
                            Set
                          </Button>
                        )}
                      </div>
                    )}
                    {next && (
                      <div className="mt-1 text-xs text-slate-500">
                        Then {formatPercent(next.marginBp)} from {formatDate(next.effectiveFrom)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
