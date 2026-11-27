import { useState } from 'react';
import { NumberInput } from '@/components/ref/NumberInput';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { tierLabel } from '@/lib/refLabels';
import { refGet, refSend } from '@/lib/refApi';

const SKU_CLASSES = ['A', 'B', 'C'] as const;
const BUYER_TIERS = ['TRADER', 'DISTRIBUTOR', 'DEALER', 'RETAILER'] as const;

interface Cell {
  skuClass: string;
  buyerTier: string;
  marginBp: number;
  status: 'CURRENT' | 'SCHEDULED' | 'PAST';
}

/**
 * Masters → Margin matrix, as the reference (app/(admin)/masters/margin-matrix): edit any cells, then save once;
 * each changed cell is saved as a new row that starts now (history is never overwritten).
 * "SKUs override this class" counts SKU price matrix cells, which come in build R8 (0 until then).
 */
export function MarginMatrixPage() {
  useDocumentTitle('Margin matrix');
  const [grid, setGrid] = useState<Cell[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const overridesByClass: Record<string, number> = {};

  async function load() {
    const data = await refGet<{ cells: Cell[] }>('/margin-cells');
    setGrid((data.cells ?? []).filter((c) => c.status === 'CURRENT'));
  }

  useOnMount(load);

  const key = (skuClass: string, buyerTier: string) => `${skuClass}:${buyerTier}`;
  const currentPct = (skuClass: string, buyerTier: string) => {
    const cell = grid.find((c) => c.skuClass === skuClass && c.buyerTier === buyerTier);
    return cell ? cell.marginBp / 100 : undefined;
  };

  function cellValue(skuClass: string, buyerTier: string): number | undefined {
    const k = key(skuClass, buyerTier);
    if (k in drafts) return drafts[k];
    return currentPct(skuClass, buyerTier);
  }

  function setCell(skuClass: string, buyerTier: string, value: number | undefined) {
    setSaved(false);
    setDrafts((d) => ({ ...d, [key(skuClass, buyerTier)]: value }));
  }

  // Only cells whose draft actually differs from what is saved count as a change.
  const pendingEntries = Object.entries(drafts).filter(([k, v]) => {
    if (v === undefined) return false;
    const [skuClass = '', buyerTier = ''] = k.split(':');
    return v !== currentPct(skuClass, buyerTier);
  });

  async function saveAll() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      for (const [k, marginPct] of pendingEntries) {
        const [skuClass = '', buyerTier = ''] = k.split(':');
        const res = await refSend('POST', '/margin-cells', {
          skuClass,
          buyerTier,
          marginBp: Math.round((marginPct ?? 0) * 100),
        });
        if (!res.ok) {
          setError(`${skuClass} × ${tierLabel(buyerTier)}: ${res.message}`);
          return;
        }
      }
      setDrafts({});
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Margin matrix</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Margin % by SKU class and buyer tier. Edit any cells you need, then save once — saving
        records a new effective-dated row per changed cell, it never overwrites history.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="mb-3 text-sm text-green-700">Saved.</p>}

      <div className="overflow-x-auto">
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2">Class \ Tier</th>
              {BUYER_TIERS.map((t) => (
                <th key={t} className="py-2">
                  {tierLabel(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SKU_CLASSES.map((skuClass) => (
              <tr key={skuClass} className="border-t border-zinc-100">
                <td className="py-2 font-medium text-zinc-700">
                  {skuClass}
                  <div className="text-xs font-normal text-zinc-400">
                    {overridesByClass[skuClass] ?? 0} SKU
                    {(overridesByClass[skuClass] ?? 0) === 1 ? '' : 's'} override this class
                  </div>
                </td>
                {BUYER_TIERS.map((buyerTier) => (
                  <td key={buyerTier} className="py-2 pr-4">
                    <NumberInput
                      ariaLabel={`Margin ${skuClass} ${tierLabel(buyerTier)}`}
                      value={cellValue(skuClass, buyerTier)}
                      onChange={(v) => setCell(skuClass, buyerTier, v)}
                      min={0}
                      step={0.1}
                      className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void saveAll()}
        disabled={saving || pendingEntries.length === 0}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving
          ? 'Saving…'
          : pendingEntries.length > 0
            ? `Save ${pendingEntries.length} change${pendingEntries.length === 1 ? '' : 's'}`
            : 'Save'}
      </button>
    </div>
  );
}
