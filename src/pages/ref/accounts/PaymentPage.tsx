import { useMemo, useState } from 'react';
import { useCurrentUser } from '@/features/auth/hooks';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR, todayIST } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * Payment, copied from the reference (app/(accounts)/payment). Sellers whose goods passed inspection: tick POs, create
 * the payment, release it, then type each line's UTR. Our API: GET /payouts/payables, GET /payout-batches?status=,
 * POST /payout-batches, POST /payout-batches/:id/release (password re-check), POST .../lines/:lineId/proof.
 * Differences from the reference:
 * - Founder or Admin release (not the Controller), after typing their password again.
 * - A line is paid by its UTR (paid today); a screenshot alone is not taken.
 * - Refunds can be ticked into the same payment.
 * - A PO waiting for the seller's bill or on hold is listed but cannot be ticked.
 */
interface PoRow {
  id: string;
  number: string;
  seller: { number: string; firmName: string };
  acceptedBoxes: number;
  netPaise: number;
  freightPaise: number;
  sellerBill: { number: string } | null;
  waiting: string | null;
}
interface RefundRow {
  id: string;
  number: string;
  buyer: { firmName: string };
  reason: string;
  amountPaise: number;
}
interface BatchLine {
  id: string;
  type: 'PAYOUT' | 'REFUND';
  reference: string;
  payee: { firmName: string };
  amountPaise: number;
  status: 'DRAFT' | 'PROOF_PENDING' | 'PAID';
  utr: string | null;
}
interface Batch {
  id: string;
  number: string;
  status: 'DRAFT' | 'RELEASED' | 'CANCELLED';
  version: number;
  bankName: string;
  builtByMe: boolean;
  lines: BatchLine[];
}
interface Bank {
  id: string;
  name: string;
  active: boolean;
}

const RULES = [
  "Only POs with inspection passed and the seller's bill on file can be ticked.",
  'Pay for accepted boxes only (less any to-pay freight). Several POs of one seller can go in one payment.',
  'Create payment → Founder or Admin releases → the line sits in Payment proof pending until its UTR is entered. No proof, not paid.',
  'The person who creates the payment cannot release it.',
];

export function PaymentPage() {
  const { data: me } = useCurrentUser();
  const canRelease = me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  const [pos, setPos] = useState<PoRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [bankId, setBankId] = useState('');
  const [proofInput, setProofInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState<Batch | null>(null);

  async function load() {
    const [payables, drafts, released] = await Promise.all([
      refGet<{ purchaseOrders: PoRow[]; refunds: RefundRow[] }>('/payouts/payables'),
      refGet<{ batches: Batch[] }>('/payout-batches', { status: 'DRAFT', pageSize: 100 }),
      refGet<{ batches: Batch[] }>('/payout-batches', { status: 'RELEASED', pageSize: 100 }),
    ]);
    setPos(payables.purchaseOrders);
    setRefunds(payables.refunds);
    setBatches([
      ...drafts.batches,
      ...released.batches.filter((b) => b.lines.some((l) => l.status !== 'PAID')),
    ]);
  }

  useOnMount(async () => {
    await load();
    const res = await refGet<{ bankAccounts: Bank[] }>('/bank-accounts');
    setBanks(res.bankAccounts.filter((b) => b.active));
  });

  const bySeller = useMemo(() => {
    const map = new Map<string, PoRow[]>();
    for (const po of pos) map.set(po.seller.firmName, [...(map.get(po.seller.firmName) ?? []), po]);
    return map;
  }, [pos]);

  const selectedPos = pos.filter((p) => ticked[p.id]);
  const selectedRefunds = refunds.filter((r) => ticked[r.id]);
  const selectedCount = selectedPos.length + selectedRefunds.length;
  const selectedTotal =
    selectedPos.reduce((a, p) => a + p.netPaise, 0) +
    selectedRefunds.reduce((a, r) => a + r.amountPaise, 0);

  async function createPayment() {
    setError('');
    if (!bankId || selectedCount === 0) {
      setError('Tick at least one PO and pick a bank');
      return;
    }
    const res = await refSend('POST', '/payout-batches', {
      bankLedgerId: bankId,
      purchaseOrderIds: selectedPos.map((p) => p.id),
      refundIds: selectedRefunds.map((r) => r.id),
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setTicked({});
    await load();
  }

  async function release(batch: Batch) {
    setError('');
    setBusy(batch.id);
    const res = await refSend('POST', `/payout-batches/${batch.id}/release`, {
      version: batch.version,
    });
    setBusy(null);
    if (!res.ok) {
      if (res.code === 'STEP_UP_REQUIRED') {
        setNeedPassword(batch);
        return;
      }
      setError(res.message);
      return;
    }
    await load();
  }

  async function confirmPassword() {
    if (!needPassword) return;
    const res = await refSend('POST', '/auth/step-up', { password });
    setPassword('');
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const batch = needPassword;
    setNeedPassword(null);
    await release(batch);
  }

  async function addProof(batch: Batch, line: BatchLine) {
    setError('');
    setBusy(line.id);
    const res = await refSend('POST', `/payout-batches/${batch.id}/lines/${line.id}/proof`, {
      utr: proofInput[line.id]?.trim() ?? '',
      paidOn: todayIST(),
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Payment</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Sellers whose goods passed inspection. Tick one or many POs, create the payment, then add
        the UTR for each once the bank has paid it.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-zinc-300 bg-white p-3">
        <span className="text-sm">
          <b>{selectedCount}</b> ticked
        </span>
        <span className="text-sm font-semibold">{formatPaiseAsINR(selectedTotal)}</span>
        <select
          aria-label="Bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
        >
          <option value="">Bank…</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => void createPayment()}
          className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Create payment
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {needPassword && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <span>Type your password to release {needPassword.number}:</span>
          <input
            type="password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void confirmPassword()}
            className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setNeedPassword(null)}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {[...bySeller.entries()].map(([seller, list]) => (
        <div key={seller} className="mb-3 overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs">
              <tr>
                <th className="w-9 px-3 py-2" />
                <th colSpan={4} className="px-3 py-2 text-left font-semibold">
                  {seller} · {list.length} PO ·{' '}
                  {formatPaiseAsINR(list.reduce((a, p) => a + p.netPaise, 0))}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((po) => (
                <tr key={po.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Tick ${po.number}`}
                      disabled={Boolean(po.waiting)}
                      checked={!!ticked[po.id]}
                      onChange={(e) => setTicked((t) => ({ ...t, [po.id]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono font-medium">{po.number}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {po.acceptedBoxes} boxes accepted
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {po.waiting ?? `bill ${po.sellerBill?.number ?? '—'}`}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatPaiseAsINR(po.netPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {refunds.length > 0 && (
        <div className="mb-3 overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs">
              <tr>
                <th className="w-9 px-3 py-2" />
                <th colSpan={3} className="px-3 py-2 text-left font-semibold">
                  Refunds
                </th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Tick ${r.number}`}
                      checked={!!ticked[r.id]}
                      onChange={(e) => setTicked((t) => ({ ...t, [r.id]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{r.buyer.firmName}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {r.number} · {r.reason}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatPaiseAsINR(r.amountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Payment proof pending
      </h2>
      {batches.length === 0 && (
        <p className="text-sm text-zinc-400">
          Nothing created yet. Tick POs above and press Create payment.
        </p>
      )}
      {batches.map((b) => (
        <div key={b.id} className="mb-3 overflow-x-auto rounded border border-zinc-200 bg-white">
          <div className="flex items-center justify-between bg-zinc-50 px-3 py-2 text-sm">
            <span>
              {b.number} · {b.bankName || '—'} · <span className="font-semibold">{b.status}</span>
            </span>
            {b.status === 'DRAFT' && canRelease && !b.builtByMe && (
              <button
                type="button"
                disabled={busy === b.id}
                onClick={() => void release(b)}
                className="min-h-11 rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
              >
                Release
              </button>
            )}
          </div>
          {b.status !== 'DRAFT' && (
            <table className="w-full text-sm">
              <tbody>
                {b.lines.map((it) => (
                  <tr
                    key={it.id}
                    className={`border-t border-zinc-100 ${it.status === 'PAID' ? 'bg-emerald-50' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono">{it.reference}</td>
                    <td className="px-3 py-2">{it.payee.firmName}</td>
                    <td className="px-3 py-2 text-right">{formatPaiseAsINR(it.amountPaise)}</td>
                    <td className="px-3 py-2">
                      {it.status === 'PAID' ? (
                        <span className="font-mono text-xs">{it.utr}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            placeholder="UTR"
                            aria-label={`UTR ${it.reference}`}
                            value={proofInput[it.id] ?? ''}
                            onChange={(e) =>
                              setProofInput((p) => ({ ...p, [it.id]: e.target.value }))
                            }
                            className="min-h-11 w-32 rounded border border-zinc-300 px-2 font-mono text-sm"
                          />
                          <button
                            type="button"
                            disabled={busy === it.id}
                            onClick={() => void addProof(b, it)}
                            className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
                          >
                            Save UTR
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <RulesBox rules={RULES} />
    </div>
  );
}
