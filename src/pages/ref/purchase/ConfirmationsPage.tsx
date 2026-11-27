import { useState } from 'react';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

/** A trade waiting for the seller's answer (buyer b3, seller s1): the reference's PENDING confirmation. */
interface Confirmation {
  id: string;
  version: number;
  buyerStage: string;
  party: { firmName: string } | null;
  productName: string;
  packLabel: string | null;
  boxesWanted: number | null;
}

const CURRENT_YEAR = new Date().getFullYear();

// "25-27" = produced 2025, expires 2027 (2-year shelf life). Centred on this year, as the reference.
const YEAR_RANGE_OPTIONS = [-2, -1, 0, 1, 2].map((offset) => {
  const producedYear = CURRENT_YEAR + offset;
  const expiryYear = producedYear + 2;
  return {
    value: String(expiryYear),
    label: `${String(producedYear).slice(-2)}-${String(expiryYear).slice(-2)}`,
  };
});
const DEFAULT_EXPIRY_YEAR = String(CURRENT_YEAR + 2);

const MONTH_OPTIONS = [
  { value: '', label: 'Any month' },
  ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (label, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label,
    }),
  ),
];

/**
 * Purchase → Confirmations, as the reference (app/(purchase)/confirmations). Each card is a trade waiting for the
 * seller. Confirm = "Seller confirms" (boxes, expiry, optional batch); Decline = "Seller declines" (no stock);
 * Requote = the seller wants a new rate ("Seller declines" with the reason Rate changed), so Sales sends it again.
 * Our expiry is a month: "Any month" is saved as January of that year, the earliest it can be.
 */
export function ConfirmationsPage() {
  useDocumentTitle('Confirmations');
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmedBoxes, setConfirmedBoxes] = useState<number | undefined>(undefined);
  const [expiryYear, setExpiryYear] = useState(DEFAULT_EXPIRY_YEAR);
  const [expiryMonth, setExpiryMonth] = useState('');
  const [fromMyStock, setFromMyStock] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardError, setCardError] = useState<Record<string, string>>({});

  async function load() {
    const data = await refGet<{ trades: Confirmation[] }>('/trades/seller-side', {
      stage: 'S1_CONFIRMATION',
      pageSize: 100,
    });
    setConfirmations((data.trades ?? []).filter((c) => c.buyerStage === 'B3_PENDING_SELLER'));
  }

  useOnMount(load);

  async function confirm(c: Confirmation) {
    setErrors({});
    if (confirmedBoxes === undefined) {
      setErrors({ confirmedBoxes: 'Enter how many boxes the seller can supply.' });
      return;
    }
    const res = await refSend('POST', `/trades/${c.id}/actions/confirmStock`, {
      version: c.version,
      boxes: confirmedBoxes,
      expiryMonth: `${expiryYear}-${expiryMonth || '01'}`,
      ...(batchNumber.trim() ? { batchNumber: batchNumber.trim() } : {}),
    });
    if (!res.ok) {
      const field = res.field === 'boxes' ? 'confirmedBoxes' : (res.field ?? '_form');
      setErrors({ [field]: res.message });
      return;
    }
    setOpenId(null);
    setConfirmedBoxes(undefined);
    setExpiryYear(DEFAULT_EXPIRY_YEAR);
    setExpiryMonth('');
    setBatchNumber('');
    setFromMyStock(false);
    await load();
  }

  function openConfirm(c: Confirmation) {
    setErrors({});
    setOpenId(openId === c.id ? null : c.id);
    setConfirmedBoxes(c.boxesWanted ?? undefined); // the full pile; edit down for a short supply
  }

  async function decline(c: Confirmation, reason: 'NO_STOCK' | 'RATE_CHANGED') {
    setCardError((e) => ({ ...e, [c.id]: '' }));
    const res = await refSend('POST', `/trades/${c.id}/actions/declineStock`, {
      version: c.version,
      reason,
    });
    if (!res.ok) setCardError((e) => ({ ...e, [c.id]: res.message }));
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Confirmations</h1>

      <div className="flex flex-col gap-3">
        {confirmations.map((c) => (
          <div key={c.id} className="rounded border border-zinc-200 p-4" data-testid="confirmation">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <strong>{c.productName || 'Unknown product'}</strong>
                {c.packLabel ? ` — ${c.packLabel}` : ''} · {c.boxesWanted ?? 0} boxes · seller{' '}
                <strong>{c.party?.firmName ?? '—'}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openConfirm(c)}
                  className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => void decline(c, 'RATE_CHANGED')}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs"
                >
                  Requote
                </button>
                <button
                  type="button"
                  onClick={() => void decline(c, 'NO_STOCK')}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
            {cardError[c.id] && <p className="mt-1 text-xs text-red-600">{cardError[c.id]}</p>}

            {openId === c.id && (
              <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
                <label className="flex flex-col gap-1 text-sm text-zinc-700">
                  Boxes he can supply (of {c.boxesWanted ?? 0} requested)
                  <QuantityStepper
                    ariaLabel="Boxes he can supply"
                    value={confirmedBoxes}
                    onChange={setConfirmedBoxes}
                    min={1}
                    max={c.boxesWanted ?? undefined}
                  />
                  {errors.confirmedBoxes && (
                    <p className="text-xs text-red-600">{errors.confirmedBoxes}</p>
                  )}
                </label>
                <label className="flex flex-col gap-1 text-sm text-zinc-700">
                  Expiry (produced-expiry years)
                  <select
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {YEAR_RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-zinc-700">
                  Month (optional)
                  <select
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {MONTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.expiryMonth && (
                    <p className="text-xs text-red-600">{errors.expiryMonth}</p>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={fromMyStock}
                    onChange={(e) => setFromMyStock(e.target.checked)}
                  />
                  From my stock
                </label>
                {fromMyStock && (
                  <label className="flex flex-col gap-1 text-sm text-zinc-700">
                    Batch number
                    <input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                    {errors.batchNumber && (
                      <p className="text-xs text-red-600">{errors.batchNumber}</p>
                    )}
                  </label>
                )}
                {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
                <button
                  type="button"
                  onClick={() => void confirm(c)}
                  className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Submit confirmation
                </button>
              </div>
            )}
          </div>
        ))}
        {confirmations.length === 0 && <p className="text-sm text-zinc-500">Nothing pending.</p>}
      </div>
    </div>
  );
}
