import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountLast4: string;
  ifsc: string | null;
}

/**
 * Masters → Bank accounts, as the reference (app/(admin)/masters/bank-accounts): label, bank name, account number,
 * IFSC. A bank account is also its ledger in our books. One difference: the full account number is kept locked on
 * the server, so the list shows only its last 4 digits.
 */
export function BankAccountsPage() {
  useDocumentTitle('Bank accounts');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState({ label: '', bankName: '', accountNumber: '', ifsc: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await refGet<{ bankAccounts: BankAccount[] }>('/bank-accounts');
    setBankAccounts(data.bankAccounts ?? []);
  }

  useOnMount(load);

  async function submit() {
    setError(null);
    const res = await refSend('POST', '/bank-accounts', {
      name: form.label,
      kind: 'CURRENT',
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      ifsc: form.ifsc,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setForm({ label: '', bankName: '', accountNumber: '', ifsc: '' });
    await load();
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Bank accounts</h1>

      <div className="mb-6 flex flex-col gap-2 rounded border border-zinc-200 p-4">
        <input
          aria-label="Label"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Label (e.g. ICICI — Main)"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Bank name"
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          placeholder="Bank name"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Account number"
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          placeholder="Account number"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="IFSC"
          value={form.ifsc}
          onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
          placeholder="IFSC"
          className="rounded border border-zinc-300 px-3 py-2 text-sm uppercase"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={() => void submit()}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Add bank account
        </button>
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200">
        {bankAccounts.map((b) => (
          <div key={b.id} className="px-3 py-2 text-sm">
            <strong>{b.name}</strong> — {b.bankName} · ••••{b.accountLast4} · {b.ifsc ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}
