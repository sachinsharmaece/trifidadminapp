import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';

interface AskRow {
  id: string;
  humanCode: string;
  buyer?: { name: string };
  product: { name: string };
  sku: { packLabel: string } | null;
  quantity: number;
  status: string;
  createdAt: string;
}

/** Sales → Asks, as the reference (app/(sales)/asks): every demand for something not listed. */
export function AsksPage() {
  useDocumentTitle('Asks');
  const [asks, setAsks] = useState<AskRow[]>([]);

  useOnMount(async () => {
    const data = await refGet<{ asks: AskRow[] }>('/asks');
    setAsks(data.asks ?? []);
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Asks</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2">Code</th>
            <th className="py-2">Buyer</th>
            <th className="py-2">Product</th>
            <th className="py-2">Qty (boxes)</th>
            <th className="py-2">Status</th>
            <th className="py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {asks.map((a) => (
            <tr key={a.id} className="border-t border-zinc-100">
              <td className="py-2">{a.humanCode}</td>
              <td className="py-2">{a.buyer?.name ?? '—'}</td>
              <td className="py-2">
                {a.product.name}
                {a.sku ? ` — ${a.sku.packLabel}` : ''}
              </td>
              <td className="py-2">{a.quantity}</td>
              <td className="py-2">{a.status}</td>
              <td className="py-2">{formatDateIST(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
