import { useState } from 'react';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import type { DockLot } from './dockTypes';

/**
 * Logistics → Goods-in, as the reference (app/(logistics)/goods-in): the older one-step "cases received" for a lot
 * on the road. In our system that is the dock's arrival (no photo here, as the reference's goods-in had none);
 * the Dock screen is the full flow.
 */
export function GoodsInPage() {
  useDocumentTitle('Goods-in at Indore');
  const [lots, setLots] = useState<DockLot[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cases, setCases] = useState<Record<string, number | undefined>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await refGet<{ rows: DockLot[] }>('/dock', { lane: 'COMING', pageSize: 100 });
    setLots(data.rows ?? []);
  }
  useOnMount(load);

  async function submit(lot: DockLot) {
    setError(null);
    const boxesCounted = cases[lot.purchaseOrderId];
    if (!boxesCounted) {
      setError('Enter the number of cases received');
      return;
    }
    const res = await refSend('POST', `/dock/${lot.purchaseOrderId}/arrival`, {
      version: lot.tradeVersion,
      arrivedAt: new Date().toISOString(),
      boxesCounted,
      billWithGoods: false,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOpenId(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Goods-in at Indore</h1>
      <div className="flex flex-col gap-2">
        {lots.map((lot) => (
          <div key={lot.purchaseOrderId} className="rounded border border-zinc-200">
            <button
              type="button"
              onClick={() => setOpenId(openId === lot.purchaseOrderId ? null : lot.purchaseOrderId)}
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <span className="text-sm">
                <strong>{lot.number}</strong>
                <div className="text-xs text-zinc-500">
                  {lot.lines
                    .map((l) => `${l.productName} — ${l.packLabel} · ${l.boxes} boxes`)
                    .join(', ')}
                </div>
              </span>
              <span className="text-zinc-400">▶</span>
            </button>
            {openId === lot.purchaseOrderId && (
              <div className="flex flex-col gap-2 border-t border-zinc-100 p-4">
                <label className="flex flex-col gap-1 text-sm text-zinc-700">
                  Cases received
                  <QuantityStepper
                    ariaLabel="Cases received"
                    value={cases[lot.purchaseOrderId]}
                    onChange={(v) => setCases((c) => ({ ...c, [lot.purchaseOrderId]: v }))}
                  />
                </label>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={() => void submit(lot)}
                  className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Record goods-in
                </button>
              </div>
            )}
          </div>
        ))}
        {lots.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nothing dispatched and awaiting goods-in right now.
          </p>
        )}
      </div>
    </div>
  );
}
