import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/hooks';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR, rupeesToPaise, todayIST } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * Journal entry, copied from the reference (app/(accounts)/journal). Our API: GET /ledgers (the ledger choices),
 * GET /journals?status=PENDING_APPROVAL and ?status=POSTED, POST /journals { kind, date (today), narration, lines },
 * POST /journals/:id/approve { version }. Added: a "Kind" choice, so opening balances are typed here too.
 */
interface LedgerOpt {
  id: string;
  name: string;
  active: boolean;
}
interface JournalRow {
  id: string;
  number: string;
  kind: 'JOURNAL' | 'OPENING';
  date: string;
  narration: string;
  version: number;
  typedByMe: boolean;
  lines: { ledgerName: string; drPaise: number; crPaise: number }[];
}
interface DraftLine {
  ledgerId: string;
  dr: string;
  cr: string;
}

const RULES = [
  'Debit total = credit total, or it cannot be saved.',
  'At least two lines; each line is either debit or credit, never both.',
  'Narration is required.',
  'Saved by one person, approved by another. A posted JV is never edited — reverse it with a new JV.',
];

const blankLines = (): DraftLine[] => [
  { ledgerId: '', dr: '', cr: '' },
  { ledgerId: '', dr: '', cr: '' },
];

function JournalLines({ journal }: { journal: JournalRow }) {
  return (
    <>
      {journal.lines.map((l, i) => (
        <div key={i}>
          {l.drPaise
            ? `Dr ${l.ledgerName} ${formatPaiseAsINR(l.drPaise)}`
            : `Cr ${l.ledgerName} ${formatPaiseAsINR(l.crPaise)}`}
        </div>
      ))}
    </>
  );
}

export function JournalPage() {
  const { data: me } = useCurrentUser();
  const canApprove = me?.role === 'ACCOUNTS' || me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  const [ledgers, setLedgers] = useState<LedgerOpt[]>([]);
  const [pending, setPending] = useState<JournalRow[]>([]);
  const [posted, setPosted] = useState<JournalRow[]>([]);
  const [kind, setKind] = useState<'JOURNAL' | 'OPENING'>('JOURNAL');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<DraftLine[]>(blankLines);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [ledgerRes, pendingRes, postedRes] = await Promise.all([
      refGet<{ ledgers: LedgerOpt[] }>('/ledgers'),
      refGet<{ journals: JournalRow[] }>('/journals', {
        status: 'PENDING_APPROVAL',
        pageSize: 100,
      }),
      refGet<{ journals: JournalRow[] }>('/journals', { status: 'POSTED', pageSize: 50 }),
    ]);
    setLedgers(ledgerRes.ledgers.filter((l) => l.active));
    setPending(pendingRes.journals);
    setPosted(postedRes.journals);
  }

  useOnMount(load);

  const dr = lines.reduce((a, l) => a + (Number(l.dr) || 0), 0);
  const cr = lines.reduce((a, l) => a + (Number(l.cr) || 0), 0);
  const balanced = dr === cr && dr > 0 && lines.every((l) => l.ledgerId);

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) =>
      ls.map((l, idx) =>
        idx === i
          ? { ...l, ...patch, ...(patch.dr ? { cr: '' } : {}), ...(patch.cr ? { dr: '' } : {}) }
          : l,
      ),
    );
  }

  async function save() {
    setError('');
    if (!balanced || !narration.trim()) return;
    setBusy(true);
    const res = await refSend('POST', '/journals', {
      kind,
      date: todayIST(),
      narration,
      lines: lines.map((l) => ({
        ledgerId: l.ledgerId,
        drPaise: rupeesToPaise(Number(l.dr) || 0),
        crPaise: rupeesToPaise(Number(l.cr) || 0),
      })),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setNarration('');
    setLines(blankLines());
    await load();
  }

  async function approve(journal: JournalRow) {
    setError('');
    const res = await refSend('POST', `/journals/${journal.id}/approve`, {
      version: journal.version,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Journal entry</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Any double entry: debit one or more ledgers, credit one or more. Debit total must equal
        credit total.
      </p>

      <div className="mb-3 flex gap-2">
        <select
          aria-label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as 'JOURNAL' | 'OPENING')}
          className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
        >
          <option value="JOURNAL">Journal</option>
          <option value="OPENING">Opening balances</option>
        </select>
        <input
          placeholder="Narration (required)"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          className="min-h-11 flex-1 rounded border border-zinc-300 px-3 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Ledger</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <select
                    aria-label={`Ledger line ${i + 1}`}
                    value={l.ledgerId}
                    onChange={(e) => updateLine(i, { ledgerId: e.target.value })}
                    className="min-h-11 w-full rounded border border-zinc-300 px-2 text-sm"
                  >
                    <option value="">Choose ledger…</option>
                    {ledgers.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    aria-label={`Debit line ${i + 1}`}
                    value={l.dr}
                    onChange={(e) => updateLine(i, { dr: e.target.value })}
                    className="w-24 rounded border border-zinc-300 px-2 py-1 text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    aria-label={`Credit line ${i + 1}`}
                    value={l.cr}
                    onChange={(e) => updateLine(i, { cr: e.target.value })}
                    className="w-24 rounded border border-zinc-300 px-2 py-1 text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      className="text-xs text-zinc-500"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-900 font-semibold">
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => setLines((ls) => [...ls, { ledgerId: '', dr: '', cr: '' }])}
                  className="text-sm text-zinc-700"
                >
                  + Add line
                </button>
              </td>
              <td className="px-3 py-2 text-right">₹{dr.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-right">₹{cr.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2">
                {balanced ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Balanced
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                    Difference ₹{Math.abs(dr - cr).toLocaleString('en-IN')}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!balanced || !narration.trim() || busy}
        onClick={() => void save()}
        className="mt-3 min-h-11 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Save JV
      </button>

      {pending.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Awaiting approval
          </h2>
          <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {pending.map((j) => (
                  <tr key={j.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 font-mono">{j.number}</td>
                    <td className="px-3 py-2">{j.narration}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      <JournalLines journal={j} />
                    </td>
                    <td className="px-3 py-2">
                      {canApprove && !j.typedByMe && (
                        <button
                          type="button"
                          onClick={() => void approve(j)}
                          className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                        >
                          Approve
                        </button>
                      )}
                      {j.typedByMe && (
                        <span className="text-xs text-zinc-400">Another person approves</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Posted journals
      </h2>
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">No.</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Narration</th>
              <th className="px-3 py-2 text-left">Lines</th>
            </tr>
          </thead>
          <tbody>
            {posted.map((j) => (
              <tr key={j.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-mono">{j.number}</td>
                <td className="px-3 py-2">{formatDateIST(j.date)}</td>
                <td className="px-3 py-2">{j.narration}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  <JournalLines journal={j} />
                </td>
              </tr>
            ))}
            {posted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing posted yet.
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
