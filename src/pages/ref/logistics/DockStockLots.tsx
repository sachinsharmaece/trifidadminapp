import { useState } from 'react';
import { refSend } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';

/** A Stock PO at the dock (GET /stock-dock): TriFid buying into its own stock, with no buyer behind it. */
export interface StockLot {
  id: string;
  number: string;
  status: 'ISSUED' | 'ARRIVED' | 'CHECKED';
  seller: string;
  dispatchDueDate: string;
  boxes: number;
  arrival: { at: string; boxesCounted: number } | null;
  lines: {
    lineNo: number;
    productName: string;
    packLabel: string;
    unitsPerBox: number;
    boxes: number;
    acceptedBoxes: number | null;
    expiryFound: string | null;
  }[];
}

async function sendOrThrow(path: string, body: object) {
  const res = await refSend('POST', path, body);
  if (!res.ok) throw new Error(res.message);
}

/**
 * Stock POs on the Coming tab (reference FAST-ORDER L42.12: a Stock PO follows the normal dock). Record the arrival
 * with the boxes counted.
 */
export function StockComingLots({
  lots,
  busy,
  withBusy,
  reload,
}: {
  lots: StockLot[];
  busy: boolean;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [counted, setCounted] = useState<Record<string, string>>({});
  if (lots.length === 0) return null;
  return (
    <section className="mt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Stock POs · for TriFid Stock
      </h2>
      <div className="flex flex-col gap-2">
        {lots.map((lot) => (
          <div
            key={lot.id}
            className="rounded border border-zinc-200 bg-white p-3 text-sm"
            data-testid="stock-lot"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono font-semibold">{lot.number}</span>
              <span className="text-xs text-zinc-500">
                due {formatDateIST(lot.dispatchDueDate)}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {lot.seller} · {lot.boxes} boxes
            </p>
            {lot.lines.map((line) => (
              <p key={line.lineNo} className="text-xs">
                {line.productName} · {line.packLabel} × {line.boxes}
              </p>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <input
                aria-label={`Boxes counted ${lot.number}`}
                inputMode="numeric"
                placeholder="Boxes counted"
                value={counted[lot.id] ?? String(lot.boxes)}
                onChange={(e) => setCounted((c) => ({ ...c, [lot.id]: e.target.value }))}
                className="min-h-11 w-32 rounded border border-zinc-300 px-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void withBusy(async () => {
                    await sendOrThrow(`/stock-dock/${lot.id}/arrival`, {
                      boxesCounted: Number(counted[lot.id] ?? lot.boxes) || 0,
                    });
                    await reload();
                  })
                }
                className="min-h-11 rounded bg-blue-700 px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Record arrival
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Stock POs on the Inspect tab: per line, the boxes accepted and the expiry month found. Saving adds the accepted
 * boxes to TriFid Stock (always auto-confirm).
 */
export function StockInspectLots({
  lots,
  busy,
  withBusy,
  reload,
}: {
  lots: StockLot[];
  busy: boolean;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  if (lots.length === 0) return null;
  const key = (lotId: string, lineNo: number) => `${lotId}:${lineNo}`;
  return (
    <section className="mt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Stock POs · check into TriFid Stock
      </h2>
      <div className="flex flex-col gap-2">
        {lots.map((lot) => (
          <div
            key={lot.id}
            className="rounded border border-zinc-200 bg-white p-3 text-sm"
            data-testid="stock-inspect"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono font-semibold">{lot.number}</span>
              <span className="text-xs text-zinc-500">
                {lot.arrival ? `${lot.arrival.boxesCounted} boxes counted` : ''}
              </span>
            </div>
            {lot.lines.map((line) => (
              <div key={line.lineNo} className="mt-2 flex flex-wrap items-center gap-2">
                <span className="w-full text-xs">
                  {line.productName} · {line.packLabel} — ordered {line.boxes}
                </span>
                <label className="text-xs text-zinc-600">
                  Accepted
                  <input
                    aria-label={`Accepted ${lot.number} line ${line.lineNo}`}
                    inputMode="numeric"
                    value={accepted[key(lot.id, line.lineNo)] ?? String(line.boxes)}
                    onChange={(e) =>
                      setAccepted((a) => ({ ...a, [key(lot.id, line.lineNo)]: e.target.value }))
                    }
                    className="ml-1 min-h-11 w-20 rounded border border-zinc-300 px-2 text-sm"
                  />
                </label>
                <label className="text-xs text-zinc-600">
                  Expiry
                  <input
                    aria-label={`Expiry ${lot.number} line ${line.lineNo}`}
                    type="month"
                    value={expiry[key(lot.id, line.lineNo)] ?? ''}
                    onChange={(e) =>
                      setExpiry((x) => ({ ...x, [key(lot.id, line.lineNo)]: e.target.value }))
                    }
                    className="ml-1 min-h-11 rounded border border-zinc-300 px-2 text-sm"
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void withBusy(async () => {
                  const lines = lot.lines.map((line) => ({
                    lineNo: line.lineNo,
                    acceptedBoxes: Number(accepted[key(lot.id, line.lineNo)] ?? line.boxes) || 0,
                    expiryFound: expiry[key(lot.id, line.lineNo)] ?? '',
                  }));
                  if (lines.some((l) => !l.expiryFound))
                    throw new Error('Enter the expiry month on every line');
                  await sendOrThrow(`/stock-dock/${lot.id}/check`, { lines });
                  await reload();
                })
              }
              className="mt-3 min-h-11 w-full rounded bg-blue-700 px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Pass into TriFid Stock
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
