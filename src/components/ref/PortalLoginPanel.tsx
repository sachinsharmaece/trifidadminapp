import { useState, type FormEvent } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';

interface PortalAccount {
  id: string;
  mobile: string;
  personName: string | null;
  active: boolean;
}

/**
 * Staff-side "Portal login" panel on the buyer and seller pages (reference components/forms/PortalLoginPanel).
 * Enable a login for a mobile number, suspend it, reactivate it. Turning a login on is always a person's
 * decision, never automatic.
 */
export function PortalLoginPanel({
  partyType,
  partyId,
  defaultMobile,
}: {
  partyType: 'BUYER' | 'SELLER';
  partyId: string;
  defaultMobile: string;
}) {
  const apiBase =
    partyType === 'BUYER'
      ? `/buyers/${partyId}/portal-account`
      : `/sellers/${partyId}/portal-account`;
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [mobile, setMobile] = useState(defaultMobile);
  const [personName, setPersonName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ accounts: PortalAccount[] }>(apiBase);
    setAccounts(data.accounts ?? []);
  }
  useOnMount(load);

  async function enable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await refSend('POST', apiBase, {
        mobile,
        ...(personName ? { personName } : {}),
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPersonName('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(accountId: string, active: boolean) {
    await refSend('PATCH', `/portal-accounts/${accountId}`, { active });
    await load();
  }

  return (
    <div className="rounded border border-zinc-200 p-4">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">Portal login</h2>
      {accounts.length === 0 && (
        <p className="mb-3 text-sm text-zinc-500">No portal login enabled yet.</p>
      )}
      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm last:border-0"
        >
          <span>
            {a.mobile}
            {a.personName && ` — ${a.personName}`}
            {!a.active && <span className="ml-2 text-xs text-amber-600">(suspended)</span>}
          </span>
          <button
            type="button"
            onClick={() => void toggleActive(a.id, !a.active)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            {a.active ? 'Suspend' : 'Reactivate'}
          </button>
        </div>
      ))}
      <form onSubmit={(e) => void enable(e)} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="portal-mobile" className="text-xs text-zinc-500">
            Login mobile
          </label>
          <input
            id="portal-mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            inputMode="numeric"
            className="w-36 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="portal-person" className="text-xs text-zinc-500">
            Person (optional)
          </label>
          <input
            id="portal-person"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="w-40 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Enable portal login
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
