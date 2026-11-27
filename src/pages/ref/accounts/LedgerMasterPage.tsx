import { Fragment, useMemo, useState } from 'react';
import { useCurrentUser } from '@/features/auth/hooks';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * Ledger master, copied from the reference (app/(accounts)/ledger-master). Every ledger, under its group, with its
 * opening balance. Our API: GET /ledgers, POST /ledgers { name, group }. Differences from the reference:
 * - A new ledger goes only under the groups a person may add to (expenses, income, taxes, capital, loans, cash);
 *   buyers, sellers and banks get theirs from their own screens.
 * - The opening balance is typed on Journal entry as an "Opening balances" entry (Dr = Cr), not here.
 */
interface LedgerRow {
  id: string;
  name: string;
  group: string;
  opening: { paise: number; side: 'DR' | 'CR' } | null;
}

const GROUPS = [
  'Direct Expenses',
  'Indirect Expenses',
  'Indirect Income',
  'Duties & Taxes',
  'Capital',
  'Loans',
  'Cash',
];

const RULES = [
  'Buyers go under Sundry Debtors, sellers under Sundry Creditors — created automatically when a buyer or seller is onboarded.',
  'A firm that both buys and sells gets two ledgers, one in each group.',
  'Opening balances total Dr = Cr; type them on Journal entry as "Opening balances".',
  'A ledger with entries can be renamed but never deleted.',
];

export function LedgerMasterPage() {
  const { data: me } = useCurrentUser();
  const canEdit = me?.role === 'ACCOUNTS' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  const [ledgers, setLedgers] = useState<LedgerRow[]>([]);
  const [form, setForm] = useState({ name: '', group: '' });
  const [error, setError] = useState('');

  async function load() {
    const res = await refGet<{ ledgers: LedgerRow[] }>('/ledgers');
    setLedgers(res.ledgers);
  }

  useOnMount(load);

  const byGroup = useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const l of [...ledgers].sort((a, b) => a.group.localeCompare(b.group))) {
      map.set(l.group, [...(map.get(l.group) ?? []), l]);
    }
    return map;
  }, [ledgers]);

  async function addLedger() {
    setError('');
    if (!form.name.trim() || !form.group) {
      setError('Enter a ledger name and pick a group');
      return;
    }
    const res = await refSend('POST', '/ledgers', { name: form.name, group: form.group });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setForm({ name: '', group: '' });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Ledger master</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Every ledger the system can post to. Each one sits under a group, and each has an opening
        balance.
      </p>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-zinc-300 bg-white p-3">
          <input
            placeholder="Ledger name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="min-h-11 min-w-44 flex-1 rounded border border-zinc-300 px-2 text-sm"
          />
          <select
            aria-label="Group"
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
          >
            <option value="">Group…</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addLedger()}
            className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            + Add ledger
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Ledger</th>
              <th className="px-3 py-2 text-left">Group</th>
              <th className="px-3 py-2 text-right">Opening</th>
            </tr>
          </thead>
          <tbody>
            {[...byGroup.entries()].map(([groupName, list]) => (
              <Fragment key={groupName}>
                <tr className="border-t border-zinc-100 bg-zinc-50">
                  <td colSpan={3} className="px-3 py-1 font-semibold">
                    {groupName}
                  </td>
                </tr>
                {list.map((l) => (
                  <tr key={l.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 pl-6">{l.name}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">{groupName}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {l.opening ? `${formatPaiseAsINR(l.opening.paise)} ${l.opening.side}` : '—'}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <RulesBox rules={RULES} />
    </div>
  );
}
