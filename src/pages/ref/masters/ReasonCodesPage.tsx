import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface ReasonCode {
  id: string;
  code: string;
  label: string;
  context: string;
}

/**
 * The reference offers two contexts ("Buyer no / leakage (standard 12)" and "b6 leak (extra 6)"). Our engine also
 * uses a few more lists (cancel, refund, complaint…), so those stay at the end of the list.
 */
const CONTEXTS: { value: string; label: string }[] = [
  { value: 'BUYER_NO', label: 'Buyer no / leakage (standard 12)' },
  { value: 'B6_LEAK', label: 'b6 leak (extra 6)' },
  { value: 'CANCEL_SO', label: 'Cancel a sales order' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'MARG_QUERY', label: 'Marg query' },
  { value: 'SELL_LEAD_REJECT', label: 'Seller lead rejected' },
  { value: 'CALL_OUTCOME', label: 'Call outcome' },
];
const REFERENCE_CONTEXT_NAMES: Record<string, string> = {
  BUYER_NO: 'BUYER_NO_OR_LEAKAGE',
  B6_LEAK: 'B6_LEAK',
};

/** Masters → Reason codes, as the reference (app/(admin)/masters/reason-codes). */
export function ReasonCodesPage() {
  useDocumentTitle('Reason codes');
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [context, setContext] = useState('BUYER_NO');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await refGet<{ reasonCodes: ReasonCode[] }>('/reason-codes');
    setReasonCodes(data.reasonCodes ?? []);
  }

  useOnMount(load);

  async function submit() {
    setError(null);
    const res = await refSend('POST', '/reason-codes', { code, label, context });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setCode('');
    setLabel('');
    await load();
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Reason codes</h1>

      <div className="mb-6 flex flex-col gap-2 rounded border border-zinc-200 p-4">
        <input
          aria-label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {CONTEXTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={() => void submit()}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Add reason code
        </button>
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200">
        {reasonCodes.map((r) => (
          <div key={r.id} className="px-3 py-2 text-sm">
            <strong>{r.code}</strong> — {r.label}{' '}
            <span className="text-xs text-zinc-400">
              ({REFERENCE_CONTEXT_NAMES[r.context] ?? r.context})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
