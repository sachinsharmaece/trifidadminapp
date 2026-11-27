import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { refGet } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * Ledger, copied from the reference (app/(accounts)/ledger). Every buyer and seller with his balance and how many
 * days it has been pending. Our API: GET /ledgers?q= (kind BUYER / SELLER rows only, as in the reference).
 */
interface LedgerRow {
  id: string;
  name: string;
  kind: 'BANK' | 'BUYER' | 'SELLER' | 'OTHER';
  balance: { paise: number; side: 'DR' | 'CR' };
  pendingDays: number | null;
}

const RULES = [
  'Balance comes only from posted entries — receipts, bills, payments and journals.',
  'Days = days since his balance last moved off zero.',
  'Touch a party to open his statement; download it from there for any date range.',
  'A party is added in Ledger master, not here.',
];

export function LedgerPage() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<LedgerRow[]>([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | 'BUYER' | 'SELLER'>('');

  useEffect(() => {
    let live = true;
    void refGet<{ ledgers: LedgerRow[] }>('/ledgers', q ? { q } : undefined).then((res) => {
      if (!live) return;
      setParties(
        res.ledgers.filter((l) =>
          type ? l.kind === type : l.kind === 'BUYER' || l.kind === 'SELLER',
        ),
      );
    });
    return () => {
      live = false;
    };
  }, [q, type]);

  const open = (id: string) => void navigate(`/ledger/${id}`);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Ledger</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Every party with his balance and how many days it has been pending. Touch a row to open his
        statement.
      </p>

      <div className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search party"
          className="min-h-11 max-w-xs flex-1 rounded border border-zinc-300 px-3 text-sm"
        />
        <select
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as '' | 'BUYER' | 'SELLER')}
          className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
        >
          <option value="">All</option>
          <option value="BUYER">Buyers</option>
          <option value="SELLER">Sellers</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-right">Days</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((p) => (
              <tr
                key={p.id}
                tabIndex={0}
                onClick={() => open(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open(p.id);
                }}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
              >
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.kind}</td>
                <td className="px-3 py-2 text-right">
                  {formatPaiseAsINR(p.balance.paise)} {p.balance.paise ? p.balance.side : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  {p.pendingDays === null ? (
                    '—'
                  ) : (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${p.pendingDays > 15 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {p.pendingDays} days
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {parties.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RulesBox rules={RULES} />
    </div>
  );
}
