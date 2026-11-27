import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR, rupeesToPaise, todayIST } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * Upcoming payments, copied from the reference (app/(accounts)/upcoming-payments). Money that came into our bank:
 * a payment Sales entered against an order (TRADE) or one Accounts added by hand (HAND).
 *
 * Our API: GET /payments?status=LOGGED. TRADE Save = POST /payments/:id/confirm (the deal card's "Confirm payment").
 * HAND Save = POST /payments/:id/confirm (posts it as the buyer's advance), then, if an order was chosen,
 * POST /payments/advances/use (spends the advance on that order). Differences from the reference:
 * - "Old balance" is not offered: our books have no old-bill settling yet, so pick an order or On account.
 * - The UTR is required when adding a row by hand, and the date it came in is today.
 */
interface PaymentRow {
  id: string;
  source: 'SALES_ENTRY' | 'HAND_ADDED';
  amountPaise: number;
  utr: string;
  receivedOn: string;
  bankName: string;
  buyer: { id: string; number: string; firmName: string };
  salesOrder: { id: string; number: string; totalPaise: number; paidPaise: number } | null;
  tradeVersion: number | null;
}
interface OpenOrder {
  salesOrderId: string;
  number: string;
  tradeId: string;
  tradeVersion: number;
  duePaise: number;
}
interface Bank {
  id: string;
  name: string;
  active: boolean;
}
interface BuyerOption {
  id: string;
  number: string;
  firmName: string;
}

const RULES = [
  'Saving against an order = payment confirmed. The order moves to Paid and the PO opens for the seller.',
  'Less than the order value → saved as advance; the order does not move until the rest comes.',
  'On account keeps the money as his advance, to be used on his next order.',
  'One person saves, another checks (maker ≠ checker).',
];

const EMPTY_FORM = { bankLedgerId: '', buyerId: '', amountRupees: '', utr: '' };

export function UpcomingPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [openOrders, setOpenOrders] = useState<Record<string, OpenOrder[]>>({});
  const [adjust, setAdjust] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const [showAdd, setShowAdd] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [buyerQuery, setBuyerQuery] = useState('');
  const [buyerOptions, setBuyerOptions] = useState<BuyerOption[]>([]);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState('');

  async function load() {
    const res = await refGet<{ payments: PaymentRow[] }>('/payments', {
      status: 'LOGGED',
      pageSize: 100,
    });
    setRows(res.payments);
    // The "Adjust against" choices: each hand-added buyer's orders waiting for payment.
    const buyerIds = [
      ...new Set(res.payments.filter((r) => r.source === 'HAND_ADDED').map((r) => r.buyer.id)),
    ];
    const lists = await Promise.all(
      buyerIds.map((buyerId) =>
        refGet<{ orders: OpenOrder[] }>('/payments/open-orders', { buyerId }),
      ),
    );
    setOpenOrders(Object.fromEntries(buyerIds.map((id, i) => [id, lists[i]?.orders ?? []])));
  }

  useOnMount(async () => {
    await load();
    const res = await refGet<{ bankAccounts: Bank[] }>('/bank-accounts');
    setBanks(res.bankAccounts.filter((b) => b.active));
  });

  async function searchBuyers(text: string) {
    setBuyerQuery(text);
    if (text.trim().length < 2) {
      setBuyerOptions([]);
      return;
    }
    const res = await refGet<{ buyers: BuyerOption[] }>('/payments/buyers', { q: text });
    setBuyerOptions(res.buyers);
  }

  function fail(id: string, message: string) {
    setErrors((e) => ({ ...e, [id]: message }));
  }

  async function saveTradeRow(row: PaymentRow) {
    setBusyId(row.id);
    fail(row.id, '');
    const res = await refSend('POST', `/payments/${row.id}/confirm`, {
      version: row.tradeVersion ?? 0,
    });
    setBusyId(null);
    if (!res.ok) return fail(row.id, res.message);
    setDone((d) => ({ ...d, [row.id]: true }));
    await load();
  }

  async function saveHandRow(row: PaymentRow) {
    const choice = adjust[row.id];
    if (!choice) return;
    setBusyId(row.id);
    fail(row.id, '');
    const posted = await refSend('POST', `/payments/${row.id}/confirm`, {});
    if (!posted.ok) {
      setBusyId(null);
      return fail(row.id, posted.message);
    }
    const order = (openOrders[row.buyer.id] ?? []).find((o) => o.salesOrderId === choice);
    if (order) {
      const used = await refSend('POST', '/payments/advances/use', {
        tradeId: order.tradeId,
        version: order.tradeVersion,
      });
      if (!used.ok) {
        setBusyId(null);
        return fail(row.id, `Saved as advance, but not used on ${order.number}: ${used.message}`);
      }
    }
    setBusyId(null);
    setDone((d) => ({ ...d, [row.id]: true }));
    await load();
  }

  async function addRow() {
    setAddError('');
    if (!addForm.bankLedgerId || !addForm.buyerId || !addForm.amountRupees) {
      setAddError('Bank, party and amount are required');
      return;
    }
    const res = await refSend('POST', '/payments/hand', {
      bankLedgerId: addForm.bankLedgerId,
      buyerId: addForm.buyerId,
      amountPaise: rupeesToPaise(Number(addForm.amountRupees)),
      utr: addForm.utr,
      receivedOn: todayIST(),
    });
    if (!res.ok) {
      setAddError(res.message);
      return;
    }
    setAddForm(EMPTY_FORM);
    setBuyerQuery('');
    setBuyerOptions([]);
    setShowAdd(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Upcoming payments</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Money that has come into our bank. Pick what it settles — his order, or his account — and
        save.
      </p>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
        >
          {showAdd ? 'Cancel' : '+ Add row by hand'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Bank"
              value={addForm.bankLedgerId}
              onChange={(e) => setAddForm((f) => ({ ...f, bankLedgerId: e.target.value }))}
              className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
            >
              <option value="">Bank…</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Search party"
              placeholder="Party (type 2 letters)…"
              value={buyerQuery}
              onChange={(e) => void searchBuyers(e.target.value)}
              className="min-h-11 w-48 rounded border border-zinc-300 px-2 text-sm"
            />
            <select
              aria-label="Party"
              value={addForm.buyerId}
              onChange={(e) => setAddForm((f) => ({ ...f, buyerId: e.target.value }))}
              className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
            >
              <option value="">Party…</option>
              {buyerOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.firmName}
                </option>
              ))}
            </select>
            <input
              placeholder="Amount ₹"
              value={addForm.amountRupees}
              onChange={(e) => setAddForm((f) => ({ ...f, amountRupees: e.target.value }))}
              className="min-h-11 w-28 rounded border border-zinc-300 px-2 text-sm"
            />
            <input
              placeholder="UTR"
              value={addForm.utr}
              onChange={(e) => setAddForm((f) => ({ ...f, utr: e.target.value }))}
              className="min-h-11 w-40 rounded border border-zinc-300 px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void addRow()}
              className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Bank</th>
              <th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">UTR · date</th>
              <th className="px-3 py-2 text-left">Adjust against</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const trade = row.source === 'SALES_ENTRY';
              return (
                <tr
                  key={row.id}
                  className={`border-t border-zinc-100 ${done[row.id] ? 'bg-emerald-50' : ''}`}
                >
                  <td className="px-3 py-2">{row.bankName || '—'}</td>
                  <td className="px-3 py-2 font-medium">{row.buyer.firmName}</td>
                  <td className="px-3 py-2 text-right">{formatPaiseAsINR(row.amountPaise)}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {row.utr || '—'} · {formatDateIST(row.receivedOn)}
                  </td>
                  <td className="px-3 py-2">
                    {trade ? (
                      <span className="text-xs text-zinc-500">
                        {row.salesOrder?.number} — due{' '}
                        {formatPaiseAsINR(
                          (row.salesOrder?.totalPaise ?? 0) - (row.salesOrder?.paidPaise ?? 0),
                        )}
                      </span>
                    ) : done[row.id] ? (
                      <span className="text-xs text-zinc-500">Saved</span>
                    ) : (
                      <select
                        aria-label={`Adjust ${row.buyer.firmName}`}
                        value={adjust[row.id] ?? ''}
                        onChange={(e) => setAdjust((a) => ({ ...a, [row.id]: e.target.value }))}
                        className="min-h-11 rounded border border-zinc-300 px-2 text-sm"
                      >
                        <option value="">Choose…</option>
                        {(openOrders[row.buyer.id] ?? []).map((o) => (
                          <option key={o.salesOrderId} value={o.salesOrderId}>
                            {o.number} — due {formatPaiseAsINR(o.duePaise)}
                          </option>
                        ))}
                        <option value="ON_ACCOUNT">On account (advance)</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {done[row.id] ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Saved
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === row.id || (!trade && !adjust[row.id])}
                        onClick={() => void (trade ? saveTradeRow(row) : saveHandRow(row))}
                        className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                    )}
                    {errors[row.id] && (
                      <p className="mt-1 text-xs text-red-600">{errors[row.id]}</p>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-400">
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
