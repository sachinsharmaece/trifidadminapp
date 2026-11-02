import { useMemo, useState } from 'react';
import { FiPhoneCall, FiPlus, FiX } from 'react-icons/fi';
import type { SellerCatalogueItem } from '../../api/purchase';
import { proxyCreateListing, type ProxyCreateListingLineInput } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { useOptionalToast } from '../../components/ui/Toast';
import {
  MONTHS,
  bandOfExpiry,
  defaultExpiryYear,
  expiryExactOf,
  expiryYearOptions,
} from './listingExpiry';

/**
 * 2 Nov — "Add to listing" in place, on the product's own card under "What he sells": one row per
 * pack — pack, expiry year, expiry month, rate, MOQ, boxes — the way a seller's price sheet reads.
 * The year opens on the pair that starts this year and the month is optional. Delivery (48 hours),
 * provenance (company billing) and territory (all India) are not asked; "More options" opens the full
 * form for My stock, a different delivery, or a product he does not carry yet. One submit lists every
 * row together as one listing (BR-113); nothing is saved if any row is refused.
 */
interface Row {
  key: number;
  skuId: string;
  year: string;
  month: string;
  rate: string;
  moq: string;
  boxes: string;
}

const CELL =
  'w-full min-w-[5rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30';

/** What the rows come to: the lines to send, or the first thing wrong, said for the row it is on. */
export function buildListingLines(
  rows: Row[],
  now: Date = new Date(),
): { lines: ProxyCreateListingLineInput[] } | { error: string } {
  const seen = new Set<string>();
  const lines: ProxyCreateListingLineInput[] = [];
  for (const [index, row] of rows.entries()) {
    const at = `Row ${index + 1}: `;
    if (!row.skuId) return { error: `${at}pick the pack.` };
    if (seen.has(row.skuId)) return { error: `${at}that pack is already in another row.` };
    seen.add(row.skuId);
    if (!row.year) return { error: `${at}pick the expiry year.` };
    const month = row.month ? Number(row.month) : null; // The month is optional.
    const band = bandOfExpiry(Number(row.year), month, now);
    if (band === 'expired') return { error: `${at}that expiry month has already passed.` };
    const rate = Math.round(Number(row.rate) * 100);
    if (!row.rate.trim() || Number.isNaN(rate) || rate <= 0) {
      return { error: `${at}enter the rate in rupees, e.g. 280.00.` };
    }
    const moq = row.moq.trim() === '' ? 1 : Number(row.moq);
    if (!Number.isInteger(moq) || moq < 1)
      return { error: `${at}MOQ is a whole number, 1 or more.` };
    const boxes = Number(row.boxes);
    if (!row.boxes.trim() || !Number.isInteger(boxes) || boxes < 1) {
      return { error: `${at}boxes is a whole number, 1 or more.` };
    }
    lines.push({
      skuId: row.skuId,
      ratePaise: rate,
      expiryBand: band,
      // Only a month that was given is an exact month; the year alone gives the band.
      ...(month ? { expiryExact: expiryExactOf(Number(row.year), month) } : {}),
      moqExact: moq,
      deliveryBand: '48h',
      provenance: 'company',
      qty: boxes,
    });
  }
  return { lines };
}

export function InlineListingPanel({
  sellerCounterpartyId,
  item,
  onListed,
  onClose,
  onMoreOptions,
}: {
  sellerCounterpartyId: string;
  item: SellerCatalogueItem;
  onListed: () => void;
  onClose: () => void;
  onMoreOptions: () => void;
}) {
  const { callApi } = useAuth();
  const toast = useOptionalToast();
  const packs = useMemo(() => item.packs.filter((p) => p.skuState !== 'draft'), [item.packs]);
  const years = useMemo(() => expiryYearOptions(), []);
  const [nextKey, setNextKey] = useState(2);
  const [rows, setRows] = useState<Row[]>([
    {
      key: 1,
      skuId: packs.length === 1 ? packs[0]!.skuId : '',
      year: defaultExpiryYear(),
      month: '',
      rate: '',
      moq: '',
      boxes: '',
    },
  ]);
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const usedSkus = new Set(rows.map((r) => r.skuId));
  const nextPack = packs.find((p) => !usedSkus.has(p.skuId));

  function addRow(): void {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        key: nextKey,
        skuId: nextPack?.skuId ?? '',
        // A blank cell on a price sheet means "as above".
        year: last?.year ?? '',
        month: last?.month ?? '',
        rate: '',
        moq: '',
        boxes: '',
      },
    ]);
    setNextKey((k) => k + 1);
  }

  async function submit(): Promise<void> {
    const built = buildListingLines(rows);
    if ('error' in built) {
      setError(built.error);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyCreateListing(token, {
          sellerCounterpartyId,
          productId: item.productId,
          scopeType: 'all_india', // Not asked: a listing from a call goes to all India.
          lines: built.lines,
          callNote: callNote.trim(),
        }),
      );
      toast?.show(
        `${item.brand}: ${built.lines.length} pack${built.lines.length === 1 ? '' : 's'} on the board.`,
      );
      onListed();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not put it on the board.');
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label={`List ${item.brand}`}
      className="mt-3 rounded-md border border-brand-500/30 bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">
          List {item.brand} <span className="font-normal text-slate-500">— one row per pack</span>
        </p>
        <button
          type="button"
          aria-label="Close"
          className="text-slate-400 hover:text-slate-600"
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pr-2 pb-1 font-medium">Pack</th>
              <th className="pr-2 pb-1 font-medium">Expiry year</th>
              <th className="pr-2 pb-1 font-medium">Month</th>
              <th className="pr-2 pb-1 font-medium">Rate, FOR Indore (₹)</th>
              <th className="pr-2 pb-1 font-medium">MOQ</th>
              <th className="pr-2 pb-1 font-medium">Boxes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <ListingRow
                key={row.key}
                row={row}
                index={i}
                packs={packs}
                years={years}
                canRemove={rows.length > 1}
                onChange={(patch) => update(row.key, patch)}
                onRemove={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<FiPlus />}
          disabled={!nextPack}
          onClick={addRow}
        >
          Add another pack
        </Button>
      </div>
      <div className="max-w-xl">
        <Textarea
          label="Authority — who you spoke to, what he said"
          hint="Called 24 Sep 11:20. He gave 1002 FOR Indore, 26–100 boxes, 2–3 days."
          required
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={submitting}
          disabled={callNote.trim() === ''}
          icon={<FiPhoneCall />}
        >
          Put it on the board
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <button type="button" className="text-sm text-brand-600 underline" onClick={onMoreOptions}>
          More options (My stock, other delivery)
        </button>
      </div>
    </form>
  );
}

function ListingRow({
  row,
  index,
  packs,
  years,
  canRemove,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  packs: SellerCatalogueItem['packs'];
  years: ReturnType<typeof expiryYearOptions>;
  canRemove: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const band = row.year
    ? bandOfExpiry(Number(row.year), row.month ? Number(row.month) : null)
    : null;
  const bandText = {
    over12: 'Over 12 months',
    under12: 'Under 12 months',
    expired: 'Already expired',
  };
  return (
    <tr className="align-top">
      <td className="pr-2 pb-2">
        <select
          aria-label={`Pack, row ${n}`}
          className={CELL}
          value={row.skuId}
          onChange={(e) => onChange({ skuId: e.target.value })}
        >
          <option value="">Select…</option>
          {packs.map((p) => (
            <option key={p.skuId} value={p.skuId}>
              {p.packLabel}
              {p.listed ? ` — on the board ₹${(p.listingRatePaise! / 100).toFixed(2)}` : ''}
            </option>
          ))}
        </select>
      </td>
      <td className="pr-2 pb-2">
        <select
          aria-label={`Expiry year, row ${n}`}
          className={CELL}
          value={row.year}
          onChange={(e) => onChange({ year: e.target.value })}
        >
          <option value="">Select…</option>
          {years.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
      </td>
      <td className="pr-2 pb-2">
        <select
          aria-label={`Expiry month, row ${n}`}
          className={CELL}
          value={row.month}
          onChange={(e) => onChange({ month: e.target.value })}
        >
          <option value="">Any</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        {band && (
          <span className="mt-0.5 block text-xs text-slate-500">
            {bandText[band]}
            {!row.month && ' · month not given'}
          </span>
        )}
      </td>
      <td className="pr-2 pb-2">
        <input
          aria-label={`Rate, row ${n}`}
          type="number"
          min={0.01}
          step={0.01}
          className={CELL}
          value={row.rate}
          onChange={(e) => onChange({ rate: e.target.value })}
        />
      </td>
      <td className="pr-2 pb-2">
        <input
          aria-label={`MOQ, row ${n}`}
          type="number"
          min={1}
          placeholder="1"
          className={CELL}
          value={row.moq}
          onChange={(e) => onChange({ moq: e.target.value })}
        />
      </td>
      <td className="pr-2 pb-2">
        <input
          aria-label={`Boxes, row ${n}`}
          type="number"
          min={1}
          className={CELL}
          value={row.boxes}
          onChange={(e) => onChange({ boxes: e.target.value })}
        />
      </td>
      <td className="pb-2">
        {canRemove && (
          <button
            type="button"
            aria-label={`Remove row ${n}`}
            className="p-1.5 text-slate-400 hover:text-danger-500"
            onClick={onRemove}
          >
            <FiX />
          </button>
        )}
      </td>
    </tr>
  );
}
