import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CurrencyInput } from '@/components/ref/CurrencyInput';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import type { RefProduct, RefSeller } from './refTypes';

interface SkuRow {
  id: string;
  packLabel: string;
  productName: string;
}
interface StockLine {
  rate: number | undefined;
  boxes: number | undefined;
}

/**
 * Purchase → Raise a purchase order, as the reference (app/(purchase)/purchase-orders/new). Trade: in our system the
 * PO is raised by itself the moment Accounts confirms the buyer has paid, so this tab only says so. Stock: buys into
 * TriFid Stock from an outside seller; the Controller approves it before it is issued.
 */
export function NewPurchaseOrderPage() {
  useDocumentTitle('Raise a purchase order');
  const navigate = useNavigate();
  const [type, setType] = useState<'TRADE' | 'STOCK'>('TRADE');
  const [sellers, setSellers] = useState<RefSeller[]>([]);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [dispatchDueDate, setDispatchDueDate] = useState('');
  const [lines, setLines] = useState<Record<string, StockLine>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useOnMount(async () => {
    const [sellersData, productsData] = await Promise.all([
      refGet<{ sellers: RefSeller[] }>('/sellers', { pageSize: 100 }),
      refGet<{ products: RefProduct[] }>('/products', { pageSize: 100 }),
    ]);
    setSellers((sellersData.sellers ?? []).filter((s) => s.active));
    setSkus(
      (productsData.products ?? []).flatMap((p) =>
        p.skus
          .filter((s) => s.active !== false)
          .map((s) => ({ id: s.id, packLabel: s.packLabel, productName: p.name })),
      ),
    );
  });

  const lineFor = (skuId: string): StockLine =>
    lines[skuId] ?? { rate: undefined, boxes: undefined };
  const setLine = (skuId: string, patch: Partial<StockLine>) =>
    setLines((ls) => ({ ...ls, [skuId]: { ...lineFor(skuId), ...patch } }));

  async function submitStock() {
    setError(null);
    const active = Object.entries(lines).filter(([, l]) => l.boxes && l.rate);
    if (!sellerId || !dispatchDueDate || active.length === 0) {
      setError(
        'Select a seller, a dispatch due date, and at least one line with a rate and boxes.',
      );
      return;
    }
    setSubmitting(true);
    const res = await refSend<{ purchaseOrder: { id: string } }>('POST', '/purchase-orders', {
      type: 'STOCK',
      sellerId,
      dispatchDueDate,
      lines: active.map(([skuId, l]) => ({
        skuId,
        sellerNetRupeesPerUnit: l.rate,
        boxes: l.boxes,
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    void navigate(`/purchase-orders/${res.data.purchaseOrder.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Raise a purchase order</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setType('TRADE')}
          className={`min-h-11 rounded border px-3 py-2 text-sm ${type === 'TRADE' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700'}`}
        >
          Trade (against an SO)
        </button>
        <button
          type="button"
          onClick={() => setType('STOCK')}
          className={`min-h-11 rounded border px-3 py-2 text-sm ${type === 'STOCK' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700'}`}
        >
          Stock (into TriFid Stock)
        </button>
      </div>

      {type === 'TRADE' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            No paid SOs without a PO. A trade PO is raised automatically the moment Accounts
            confirms that the buyer has paid the sales order in full.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            A Stock PO buys into TriFid Stock from an outside seller, with no sale order behind it.
            The Controller approves it (maker ≠ creator) before it issues, then it follows the
            normal seller dispatch → dock → inspection.
          </p>
          <label className="text-xs text-zinc-600">
            Seller
            <select
              aria-label="Seller"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            >
              <option value="">Select…</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firmName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Dispatch due date
            <input
              aria-label="Dispatch due date"
              type="date"
              value={dispatchDueDate}
              onChange={(e) => setDispatchDueDate(e.target.value)}
              className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>

          <div className="rounded border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-2 py-1 text-left">SKU</th>
                  <th className="px-2 py-1 text-right">Rate (₹/unit)</th>
                  <th className="px-2 py-1 text-right">Boxes</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => {
                  const line = lineFor(sku.id);
                  const label = `${sku.productName} — ${sku.packLabel}`;
                  return (
                    <tr key={sku.id} className="border-t border-zinc-100">
                      <td className="px-2 py-1">{label}</td>
                      <td className="px-2 py-1 text-right">
                        <CurrencyInput
                          ariaLabel={`Rate for ${label}`}
                          value={line.rate}
                          onChange={(v) => setLine(sku.id, { rate: v })}
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <QuantityStepper
                          ariaLabel={`Boxes for ${label}`}
                          value={line.boxes}
                          onChange={(v) => setLine(sku.id, { boxes: v })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => void submitStock()}
            disabled={submitting}
            className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Raising…' : 'Raise Stock PO'}
          </button>
        </div>
      )}
    </div>
  );
}
