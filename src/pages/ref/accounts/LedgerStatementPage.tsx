import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CreditCard } from '@/components/ref/credit/CreditCard';
import { CreditEditPanel } from '@/components/ref/credit/CreditEditPanel';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR } from '@/lib/refMoney';

/**
 * One party's statement, copied from the reference (app/(accounts)/ledger/[id]). Our API:
 * GET /ledgers/:id/statement?from=&to=. Differences from the reference:
 * - "Download statement" saves a CSV file (opens in Excel) made in the browser, not a PDF.
 * - A buyer's statement shows his credit card and the Accounts credit panel (the only place credit is edited).
 */
interface Balance {
  paise: number;
  side: 'DR' | 'CR';
}
interface Line {
  date: string;
  voucherNumber: string;
  voucherType: string;
  narration: string;
  drPaise: number;
  crPaise: number;
  balance: Balance;
}
interface Statement {
  ledger: { id: string; name: string; buyerId: string | null };
  lines: Line[];
  broughtForward: Balance;
}

const showBalance = (b: Balance) => `${formatPaiseAsINR(b.paise)} ${b.paise ? b.side : ''}`.trim();

export function LedgerStatementPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [data, setData] = useState<Statement | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // The "from" date of the statement on screen (the boxes may have been changed since).
  const [shownFrom, setShownFrom] = useState('');
  const [creditRefreshKey, setCreditRefreshKey] = useState(0);

  async function load() {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    setData(await refGet<Statement>(`/ledgers/${id}/statement`, params));
    setShownFrom(from);
  }

  useOnMount(load);

  function downloadStatement() {
    if (!data) return;
    const cell = (text: string) => `"${text.replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'],
      ...(shownFrom
        ? [[shownFrom, 'Brought forward', '', '', showBalance(data.broughtForward)]]
        : []),
      ...data.lines.map((l) => [
        l.date,
        `${l.voucherNumber} ${l.narration}`,
        l.drPaise ? (l.drPaise / 100).toFixed(2) : '',
        l.crPaise ? (l.crPaise / 100).toFixed(2) : '',
        showBalance(l.balance),
      ]),
    ];
    const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `statement-${data.ledger.name.replace(/\W+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <button
        type="button"
        onClick={() => void navigate('/ledger')}
        className="mb-3 text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← All parties
      </button>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">{data?.ledger.name ?? ''}</h1>
      <p className="mb-4 text-sm text-zinc-500">Statement</p>

      {data?.ledger.buyerId && (
        <div className="mb-4 flex flex-col gap-3">
          <CreditCard buyerId={data.ledger.buyerId} refreshKey={creditRefreshKey} />
          <CreditEditPanel
            buyerId={data.ledger.buyerId}
            onChanged={() => setCreditRefreshKey((k) => k + 1)}
          />
        </div>
      )}

      <div className="mb-3 flex items-end gap-2">
        <label className="flex flex-col text-xs text-zinc-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm font-medium text-zinc-700"
        >
          Apply
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Particulars</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {shownFrom && data && (
              <tr className="border-t border-zinc-100 text-zinc-500">
                <td className="px-3 py-2 font-mono text-xs">{formatDateIST(shownFrom)}</td>
                <td className="px-3 py-2">Brought forward</td>
                <td />
                <td />
                <td className="px-3 py-2 text-right font-semibold">
                  {showBalance(data.broughtForward)}
                </td>
              </tr>
            )}
            {(data?.lines ?? []).map((r, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-mono text-xs">{formatDateIST(r.date)}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-zinc-400">{r.voucherNumber}</span>{' '}
                  {r.narration}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.drPaise ? formatPaiseAsINR(r.drPaise) : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.crPaise ? formatPaiseAsINR(r.crPaise) : ''}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{showBalance(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={downloadStatement}
        className="mt-4 min-h-11 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Download statement
      </button>
    </div>
  );
}
