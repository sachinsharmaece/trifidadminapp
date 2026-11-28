import { useMemo, useState } from 'react';
import { CurrencyInput } from '@/components/ref/CurrencyInput';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR, rupeesToPaise, todayIST } from '@/lib/refMoney';

const TIERS = ['TRADER', 'DISTRIBUTOR', 'DEALER', 'RETAILER'] as const;
const TIER_LABEL: Record<string, string> = {
  TRADER: 'Trader',
  DISTRIBUTOR: 'Distributor',
  DEALER: 'Dealer',
  RETAILER: 'Retailer',
};

interface Cell {
  id: string;
  marginPaisePerUnit: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED';
  proposedBy: string;
  rejectReason: string | null;
}
interface TierColumn {
  buyerTier: string;
  label: string;
  cells: Cell[];
  resolved: { source: 'PARENT' | 'SKU'; ratePaisePerUnit: number; boxPaise: number } | null;
}
interface Row {
  skuId: string;
  productName: string;
  packLabel: string;
  skuClass: string;
  unitsPerBox: number;
  landedPaisePerUnit: number | null;
  tiers: TierColumn[];
}
interface ProductGroup {
  productName: string;
  rows: Row[];
}
interface MatrixData {
  rows: Row[];
  overriddenSharePct: number;
  warnSharePct: number;
  warn: boolean;
  currentUserId: string;
  currentUserRole: string;
}

/** Tomorrow in Indian time: new cells apply from a future date (today is also allowed by the server). */
function tomorrowIST() {
  const [y, m, d] = todayIST().split('-').map(Number);
  return new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + 1)).toISOString().slice(0, 10);
}

/**
 * Masters → SKU price matrix, copied from the reference (app/(admin)/masters/sku-margins). Margin ₹ per unit by pack
 * and buyer tier; blank follows the Parent matrix. An Admin saves drafts and submits them per product; a different
 * Admin approves or rejects; an active cell can be end-dated. Differences: reject and end-date ask inline (not a
 * browser prompt); new cells start tomorrow.
 */
export function SkuMarginsPage() {
  useDocumentTitle('SKU price matrix');
  const [data, setData] = useState<MatrixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, number | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [ending, setEnding] = useState<{ id: string; date: string } | null>(null);

  async function load() {
    try {
      setData(await refGet<MatrixData>('/sku-margins'));
    } catch {
      setError('Not found.');
    }
  }
  useOnMount(load);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const canEdit = data?.currentUserRole === 'ADMIN';
  const key = (skuId: string, tier: string) => `${skuId}:${tier}`;

  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) map.set(row.productName, [...(map.get(row.productName) ?? []), row]);
    return [...map.entries()].map(([productName, groupRows]) => ({ productName, rows: groupRows }));
  }, [rows]);
  const term = search.trim().toLowerCase();
  const shown = term ? groups.filter((g) => g.productName.toLowerCase().includes(term)) : groups;
  const isOpen = (name: string) => term.length > 0 || expanded.has(name);

  function toggle(name: string) {
    setExpanded((e) => {
      const next = new Set(e);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }
  const draftOf = (row: Row, tier: string) =>
    row.tiers.find((t) => t.buyerTier === tier)?.cells.find((c) => c.status === 'DRAFT');
  const entriesFor = (group: ProductGroup) =>
    group.rows.flatMap((row) =>
      TIERS.flatMap((tier) => {
        const rupees = editing[key(row.skuId, tier)];
        return rupees === undefined ? [] : [{ row, tier, rupees }];
      }),
    );
  const draftsFor = (group: ProductGroup) =>
    group.rows.flatMap((row) =>
      row.tiers.flatMap((t) => t.cells.filter((c) => c.status === 'DRAFT')),
    );

  async function saveProduct(group: ProductGroup) {
    const entries = entriesFor(group);
    if (entries.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const failures: string[] = [];
    for (const entry of entries) {
      const draftId = draftOf(entry.row, entry.tier)?.id;
      const res = await refSend('POST', '/sku-margins', {
        action: 'draft',
        ...(draftId ? { id: draftId } : {}),
        skuId: entry.row.skuId,
        buyerTier: entry.tier,
        marginPaisePerUnit: rupeesToPaise(entry.rupees),
        effectiveFrom: tomorrowIST(),
      });
      if (!res.ok) {
        failures.push(`${TIER_LABEL[entry.tier] ?? entry.tier}: ${res.message}`);
        continue;
      }
      setEditing((e) => {
        const next = { ...e };
        delete next[key(entry.row.skuId, entry.tier)];
        return next;
      });
    }
    if (failures.length > 0) {
      setError(`Some cells in ${group.productName} could not be saved — ${failures.join('; ')}`);
    }
    await load();
    setBusy(false);
  }

  async function submitProduct(group: ProductGroup) {
    const drafts = draftsFor(group);
    if (drafts.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const failures: string[] = [];
    const notices: string[] = [];
    for (const draft of drafts) {
      const res = await refSend<{ notice: string | null }>('POST', '/sku-margins', {
        action: 'submit',
        id: draft.id,
      });
      if (!res.ok) {
        failures.push(res.message);
        continue;
      }
      if (res.data.notice) notices.push(res.data.notice);
    }
    if (failures.length > 0) {
      setError(
        `Some drafts in ${group.productName} could not be submitted — ${failures.join('; ')}`,
      );
    }
    if (notices.length > 0) setNotice([...new Set(notices)].join(' '));
    await load();
    setBusy(false);
  }

  async function act(action: 'approve' | 'reject' | 'end-date', id: string, body: object = {}) {
    setBusy(true);
    setError(null);
    const res = await refSend('POST', `/sku-margins/${id}/${action}`, body);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setRejecting(null);
    setEnding(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">SKU price matrix</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Margin ₹ per unit by SKU and buyer tier. Blank follows the Parent matrix. Changes need a
        different Admin to approve before they go live, and only apply from a future date.
      </p>
      {data?.warn && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {data.overriddenSharePct}% of SKUs have at least one active SKU cell (above{' '}
          {data.warnSharePct}%) — this is becoming a per-SKU price list rather than a matrix with
          exceptions.
        </p>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-zinc-600">{notice}</p>}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search product…"
        className="mb-4 w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <div className="flex flex-col gap-2">
        {shown.map((group) => {
          const open = isOpen(group.productName);
          const entries = entriesFor(group);
          const drafts = draftsFor(group);
          return (
            <div
              key={group.productName}
              className="rounded border border-zinc-200"
              data-testid="sku-product"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggle(group.productName)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-zinc-800"
                >
                  <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                  {group.productName}
                  <span className="text-xs font-normal text-zinc-400">
                    {group.rows.length} pack{group.rows.length === 1 ? '' : 's'}
                  </span>
                </button>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || entries.length === 0}
                      className="whitespace-nowrap rounded bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                      onClick={() => void saveProduct(group)}
                    >
                      Save {entries.length > 0 ? `(${entries.length})` : ''}
                    </button>
                    <button
                      type="button"
                      disabled={busy || drafts.length === 0}
                      className="whitespace-nowrap rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 disabled:opacity-40"
                      onClick={() => void submitProduct(group)}
                    >
                      Submit for approval {drafts.length > 0 ? `(${drafts.length})` : ''}
                    </button>
                  </div>
                )}
              </div>
              {open && (
                <div className="overflow-x-auto border-t border-zinc-100 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500">
                        <th className="py-2 pr-4">Pack</th>
                        <th className="py-2 pr-4">Landed</th>
                        {TIERS.map((t) => (
                          <th key={t} className="py-2 pr-4">
                            {TIER_LABEL[t]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.skuId} className="border-t border-zinc-100 align-top">
                          <td className="py-2 pr-4 font-medium text-zinc-700">
                            {row.packLabel}
                            <div className="text-xs font-normal text-zinc-400">
                              Class {row.skuClass}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-zinc-600">
                            {row.landedPaisePerUnit !== null
                              ? `${formatPaiseAsINR(row.landedPaisePerUnit)} per unit`
                              : 'No live listing'}
                          </td>
                          {row.tiers.map((col) => {
                            const active = col.cells.find((c) => c.status === 'ACTIVE');
                            const pending = col.cells.find((c) => c.status === 'PENDING');
                            const draft = col.cells.find((c) => c.status === 'DRAFT');
                            const k = key(row.skuId, col.buyerTier);
                            return (
                              <td
                                key={col.buyerTier}
                                className="py-2 pr-4"
                                data-testid={`cell-${row.packLabel}-${col.buyerTier}`}
                              >
                                {col.resolved ? (
                                  <div className="text-xs text-zinc-500">
                                    {formatPaiseAsINR(col.resolved.ratePaisePerUnit)} per unit (
                                    {col.resolved.source === 'SKU' ? 'SKU' : 'Parent'})
                                  </div>
                                ) : (
                                  <div className="text-xs text-zinc-400">
                                    {row.landedPaisePerUnit === null ? '—' : 'No Parent cell set'}
                                  </div>
                                )}
                                {active && (
                                  <div className="text-zinc-800">
                                    {formatPaiseAsINR(active.marginPaisePerUnit)}{' '}
                                    <span className="text-xs text-zinc-400">
                                      active from {formatDateIST(active.effectiveFrom)}
                                      {active.effectiveTo
                                        ? ` to ${formatDateIST(active.effectiveTo)}`
                                        : ''}
                                    </span>
                                    {canEdit && ending?.id !== active.id && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className="ml-2 text-xs text-red-600 underline"
                                        onClick={() =>
                                          setEnding({ id: active.id, date: tomorrowIST() })
                                        }
                                      >
                                        End-date
                                      </button>
                                    )}
                                    {ending?.id === active.id && (
                                      <div className="mt-1 flex gap-1">
                                        <input
                                          type="date"
                                          aria-label="End date"
                                          value={ending.date}
                                          onChange={(e) =>
                                            setEnding({ id: active.id, date: e.target.value })
                                          }
                                          className="rounded border border-zinc-300 px-1 text-xs"
                                        />
                                        <button
                                          type="button"
                                          className="text-xs text-red-600 underline"
                                          onClick={() =>
                                            void act('end-date', active.id, {
                                              effectiveTo: ending.date,
                                            })
                                          }
                                        >
                                          Save
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {pending && (
                                  <div className="text-amber-700">
                                    {formatPaiseAsINR(pending.marginPaisePerUnit)}{' '}
                                    <span className="text-xs">pending</span>
                                    {canEdit && pending.proposedBy !== data?.currentUserId && (
                                      <div className="mt-1 flex gap-2 text-xs">
                                        <button
                                          type="button"
                                          disabled={busy}
                                          className="text-green-700 underline"
                                          onClick={() => void act('approve', pending.id)}
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          disabled={busy}
                                          className="text-red-600 underline"
                                          onClick={() =>
                                            setRejecting({ id: pending.id, reason: '' })
                                          }
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                    {rejecting?.id === pending.id && (
                                      <div className="mt-1 flex gap-1">
                                        <input
                                          aria-label="Reason for rejecting"
                                          placeholder="Reason"
                                          value={rejecting.reason}
                                          onChange={(e) =>
                                            setRejecting({ id: pending.id, reason: e.target.value })
                                          }
                                          className="w-28 rounded border border-zinc-300 px-1 text-xs"
                                        />
                                        <button
                                          type="button"
                                          className="text-xs text-red-600 underline"
                                          onClick={() =>
                                            void act('reject', pending.id, {
                                              reason: rejecting.reason,
                                            })
                                          }
                                        >
                                          Confirm
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {draft && !pending && (
                                  <div className="mb-1 text-xs text-zinc-500">
                                    Draft {formatPaiseAsINR(draft.marginPaisePerUnit)}
                                  </div>
                                )}
                                {canEdit && !pending && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <CurrencyInput
                                      ariaLabel={`Margin ${row.packLabel} ${TIER_LABEL[col.buyerTier] ?? ''}`}
                                      value={
                                        editing[k] ??
                                        (draft ? draft.marginPaisePerUnit / 100 : undefined)
                                      }
                                      onChange={(v) => setEditing((e) => ({ ...e, [k]: v }))}
                                    />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="px-2 py-3 text-sm text-zinc-400">No products match.</p>
        )}
      </div>
    </div>
  );
}
