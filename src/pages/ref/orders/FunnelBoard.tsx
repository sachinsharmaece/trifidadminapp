import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { TradeActions } from '@/features/trades/TradeActions';
import { TradeFacts } from '@/features/trades/TradeFacts';
import { useFunnel, useTrade } from '@/features/trades/hooks';
import type { TradeRow } from '@/features/trades/api';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { queryClient } from '@/services/query/queryClient';

type Side = 'buyer' | 'seller';

const BUYER_FUNNELS = [
  { key: 'B1_VIEWING', label: 'b1 Viewing', subtitle: 'Looking at a listing' },
  { key: 'B2_INQUIRY', label: 'b2 Inquiry', subtitle: 'Ask recorded' },
  { key: 'B3_PENDING_SELLER', label: 'b3 Pending seller', subtitle: 'Waiting on Purchase' },
  {
    key: 'B4_SEND_CONFIRMATION',
    label: 'b4 Send confirmation',
    subtitle: 'Ready to send to buyer',
  },
  { key: 'B5_BUYERS_CALL', label: "b5 Buyer's call", subtitle: 'Waiting for yes/no' },
  { key: 'B6_ORDER_CONFIRMED', label: 'b6 Order confirmed', subtitle: 'Payment window open' },
  { key: 'B7_PAID', label: 'b7 Paid', subtitle: 'Waiting for dock' },
  { key: 'B8_BILLED', label: 'b8 Billed', subtitle: 'Marg bill / dispatch' },
  { key: 'B9_DISPATCH', label: 'b9 Dispatch', subtitle: 'On the way to buyer' },
  { key: 'B10_DELIVERED', label: 'b10 Delivered', subtitle: 'Confirm or complain' },
  { key: 'B11_COMPLAINTS', label: 'b11 Complaints', subtitle: 'Open complaint' },
  { key: 'X_LEAKAGE', label: 'x Leakage', subtitle: 'Lost — can reopen' },
];

// Our seller side splits the reference's s5 into "on the way" and "at the dock"; the bill (reference s4) is a
// button on the PO, not a stage.
const SELLER_FUNNELS = [
  { key: 'S0_DEMAND', label: 's0 Demand', subtitle: 'Not listed — quote due' },
  { key: 'S1_CONFIRMATION', label: 's1 Confirmation', subtitle: 'Listed pile — confirm quantity' },
  { key: 'S2_HOLD', label: 's2 Hold', subtitle: 'Holding stock 24h' },
  { key: 'S3_PO', label: 's3 PO', subtitle: 'PO raised' },
  { key: 'S5_DISPATCHED', label: 's5 Dispatched', subtitle: 'On the way to the dock' },
  { key: 'S5_ARRIVED', label: 's5 At the dock', subtitle: 'At dock — awaiting check' },
  { key: 'S6_PAYMENT', label: 's6 Payment', subtitle: 'Seller payable' },
];

const BAND_LABEL: Record<string, string> = {
  M6_TO_9: '6–9 months',
  M9_TO_12: '9–12 months',
  M12_PLUS: '12+ months',
};

interface Party {
  id: string;
  number: string;
  firmName: string;
}
interface BoardRow {
  id: string;
  skuId: string;
  productName: string;
  packLabel: string;
  buyerRatePaisePerUnit: number | null;
  boxValuePaise: number | null;
  expiryBand: string;
  moqBoxes: number;
  quantityBoxes: number;
}
interface SkuOption {
  id: string;
  packLabel: string;
  productId: string;
  productName: string;
}

/** "3h 20m left" / "overdue by 2h", amber in the last hour, as the reference's SLA chip. */
function slaOf(due: TradeRow['due'], now = Date.now()) {
  if (!due) return null;
  const ms = new Date(due.at).getTime() - now;
  const mins = Math.round(Math.abs(ms) / 60_000);
  const text = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  return ms < 0
    ? { overdue: true, amber: false, label: `${due.label}: overdue by ${text}` }
    : { overdue: false, amber: ms < 3_600_000, label: `${due.label}: ${text} left` };
}

/** The open row's popup: the trade's facts and its buttons (our deal-card forms, one engine for every screen). */
export function TradePopup({ id }: { id: string }) {
  const { data: trade, isLoading } = useTrade(id);
  if (isLoading || !trade) return <p className="text-xs text-zinc-400">Loading…</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded border border-zinc-200 bg-white p-2 text-xs">
        <TradeFacts trade={trade} />
      </div>
      <TradeActions trade={trade} />
    </div>
  );
}

/**
 * The reference's funnel board (components/funnel/FunnelBoard.tsx): pick a party (or none for all), then one
 * collapsible card per stage with its count and how many are late; a row opens its popup with the facts and the
 * actions. On the buyer side with a buyer picked, "b0 On the board" lists what he can buy at his rate: opening a
 * row starts a viewing (b1), "He wants it" moves it to b2, and "Not on the board? Ask for it" records an ask.
 */
export function FunnelBoard({
  side,
  partyId: fixedPartyId,
}: {
  side: Side;
  partyId?: string | undefined;
}) {
  const navigate = useNavigate();
  const isFixedParty = Boolean(fixedPartyId);
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string | undefined>(fixedPartyId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [boardRows, setBoardRows] = useState<BoardRow[]>([]);
  const [indicative, setIndicative] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [boardOpenListingId, setBoardOpenListingId] = useState<string | null>(null);
  const [boardAskQty, setBoardAskQty] = useState<Record<string, number | undefined>>({});
  const [boardTrade, setBoardTrade] = useState<Record<string, { id: string; version: number }>>({});
  const [boardError, setBoardError] = useState<string | null>(null);
  const [notOnBoardOpen, setNotOnBoardOpen] = useState(false);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [notOnBoardSkuId, setNotOnBoardSkuId] = useState('');
  const [notOnBoardQty, setNotOnBoardQty] = useState<number | undefined>(undefined);
  const [notOnBoardError, setNotOnBoardError] = useState<string | null>(null);

  useOnMount(async () => {
    const data = await refGet<{ buyers?: Party[]; sellers?: Party[] }>(
      side === 'buyer' ? '/buyers' : '/sellers',
      {
        pageSize: 100,
      },
    );
    setParties(data.buyers ?? data.sellers ?? []);
    if (side === 'buyer') {
      const p = await refGet<{
        products: {
          id: string;
          name: string;
          skus: { id: string; packLabel: string; active?: boolean }[];
        }[];
      }>('/products', { pageSize: 100 });
      setSkus(
        (p.products ?? []).flatMap((prod) =>
          prod.skus
            .filter((s) => s.active !== false)
            .map((s) => ({
              id: s.id,
              packLabel: s.packLabel,
              productId: prod.id,
              productName: prod.name,
            })),
        ),
      );
    }
  });

  const selectedParty = parties.find((p) => p.id === partyId);
  const { data } = useFunnel(side, {
    stage: '',
    q: selectedParty?.number ?? '',
    page: 1,
    pageSize: 100,
  });
  const trades = partyId && !selectedParty ? [] : (data?.trades ?? []);

  async function loadBoard() {
    if (side !== 'buyer' || !partyId) return;
    const b = await refGet<{ buyer: { indicative: boolean }; rows: BoardRow[] }>(
      `/buyers/${partyId}/board`,
      {
        pageSize: 100,
      },
    );
    setBoardRows(b.rows ?? []);
    setIndicative(b.buyer.indicative);
  }

  useEffect(() => {
    if (side !== 'buyer' || !partyId) return;
    let cancelled = false;
    void refGet<{ buyer: { indicative: boolean }; rows: BoardRow[] }>(`/buyers/${partyId}/board`, {
      pageSize: 100,
    }).then((b) => {
      if (cancelled) return;
      setBoardRows(b.rows ?? []);
      setIndicative(b.buyer.indicative);
    });
    return () => {
      cancelled = true;
    };
  }, [side, partyId]);

  const funnels = side === 'buyer' ? BUYER_FUNNELS : SELLER_FUNNELS;
  const partyLabel = side === 'buyer' ? 'buyers' : 'sellers';
  const stageOf = (t: TradeRow) => (side === 'buyer' ? t.buyerStage : t.sellerStage);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['trades'] });

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // b0 move A: opening a board row starts (or reopens) the viewing, b1.
  async function openBoardRow(row: BoardRow) {
    if (boardOpenListingId === row.id) {
      setBoardOpenListingId(null);
      return;
    }
    setBoardError(null);
    const res = await refSend<{ trade: { id: string; version: number } }>(
      'POST',
      '/trades/open-viewing',
      {
        buyerId: partyId,
        listingId: row.id,
      },
    );
    if (!res.ok) {
      setBoardError(res.message);
      return;
    }
    setBoardTrade((m) => ({
      ...m,
      [row.id]: { id: res.data.trade.id, version: res.data.trade.version },
    }));
    setBoardAskQty((q) => ({ ...q, [row.id]: undefined }));
    setBoardOpenListingId(row.id);
    refresh();
  }

  // b0 move B: "He wants it" with the ask quantity, b2.
  async function wantsIt(row: BoardRow) {
    const t = boardTrade[row.id];
    const boxes = boardAskQty[row.id];
    if (!t || !boxes) return;
    setBoardError(null);
    const res = await refSend('POST', `/trades/${t.id}/actions/wantIt`, {
      version: t.version,
      boxes,
    });
    if (!res.ok) {
      setBoardError(res.message);
      return;
    }
    setBoardOpenListingId(null);
    setStatusMessage(`Sent to inquiry: ${boxes} boxes of ${row.productName}`);
    setExpanded((prev) => new Set(prev).add('B2_INQUIRY'));
    refresh();
    await loadBoard();
  }

  async function submitNotOnBoard() {
    setNotOnBoardError(null);
    const sku = skus.find((s) => s.id === notOnBoardSkuId);
    if (!sku || !notOnBoardQty) {
      setNotOnBoardError('Pick a product and a quantity.');
      return;
    }
    const res = await refSend('POST', '/asks', {
      buyerId: partyId,
      productId: sku.productId,
      skuId: sku.id,
      quantity: notOnBoardQty,
      reasonCode: 'NO_STOCK_LISTED',
    });
    if (!res.ok) {
      setNotOnBoardError(`${sku.productName}: ${res.message}`);
      return;
    }
    setNotOnBoardOpen(false);
    setNotOnBoardSkuId('');
    setNotOnBoardQty(undefined);
    setStatusMessage(
      `Sent to inquiry: ${notOnBoardQty} boxes of ${sku.productName} (not on the board)`,
    );
    setExpanded((prev) => new Set(prev).add('B2_INQUIRY'));
    refresh();
  }

  const partyOptions: NamePickerOption[] = parties.map((p) => ({ id: p.id, label: p.firmName }));
  const buyerTrades = side === 'buyer' ? trades : [];
  const filteredBoard = boardSearch.trim()
    ? boardRows.filter((r) =>
        r.productName.toLowerCase().includes(boardSearch.trim().toLowerCase()),
      )
    : boardRows;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="mb-4 flex flex-col gap-2">
        {!isFixedParty && (
          <NamePicker
            ariaLabel={`Search ${partyLabel}`}
            options={partyOptions}
            value={partyId}
            onChange={(id) => {
              setPartyId(id);
              setOpenRowId(null);
            }}
            placeholder={`Search ${partyLabel} by name…`}
          />
        )}
        {selectedParty && (
          <div className="flex items-center justify-between rounded bg-zinc-100 px-3 py-2 text-sm">
            <span>
              Showing: <strong>{selectedParty.firmName}</strong>
            </span>
            <button
              type="button"
              onClick={() =>
                isFixedParty ? void navigate(`/${side}-funnels`) : setPartyId(undefined)
              }
              className="flex min-h-11 items-center px-2 text-xs text-zinc-500 underline"
            >
              Clear — all {partyLabel}
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {statusMessage}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {side === 'buyer' && (
          <div className="rounded border border-zinc-200 bg-white" data-testid="board-card">
            <button
              type="button"
              onClick={() => partyId && setBoardExpanded((e) => !e)}
              disabled={!partyId}
              className="flex w-full items-center justify-between px-4 py-3 text-left disabled:opacity-50"
            >
              <span>
                <span className="block text-sm font-medium text-zinc-900">b0 On the board</span>
                <span className="text-xs text-zinc-400">
                  {partyId ? 'Live catalogue for this buyer' : 'Pick a buyer first'}
                </span>
              </span>
              {partyId && (
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    {boardRows.length}
                  </span>
                  <span
                    className={`text-zinc-400 transition-transform ${boardExpanded ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                </span>
              )}
            </button>

            {boardExpanded && partyId && (
              <div className="flex flex-col gap-2 border-t border-zinc-100 p-3">
                <input
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  placeholder="Search product…"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
                {boardError && <p className="text-xs text-red-600">{boardError}</p>}
                <div className="flex flex-col divide-y divide-zinc-100">
                  {filteredBoard.length === 0 && (
                    <p className="py-3 text-sm text-zinc-400">Nothing listed.</p>
                  )}
                  {filteredBoard.map((row) => {
                    const unavailable = row.buyerRatePaisePerUnit === null;
                    const rateDisplay = unavailable
                      ? 'Rate unavailable'
                      : `${formatPaiseAsINR(row.buyerRatePaisePerUnit ?? 0)} per unit`;
                    const viewing = buyerTrades.some(
                      (t) => t.listingId === row.id && t.buyerStage === 'B1_VIEWING',
                    );
                    const inInquiry = buyerTrades.some(
                      (t) => t.listingId === row.id && t.buyerStage === 'B2_INQUIRY',
                    );
                    const qty = boardAskQty[row.id];
                    return (
                      <div key={row.id} className="py-3" data-testid="board-row">
                        <button
                          type="button"
                          onClick={() => void openBoardRow(row)}
                          className="flex w-full items-center justify-between gap-2 text-left text-sm"
                        >
                          <span>
                            {row.productName} — {row.packLabel}
                            {viewing && (
                              <span className="ml-2 text-xs text-amber-600">Viewing</span>
                            )}
                            {inInquiry && (
                              <span className="ml-2 text-xs text-emerald-600">In inquiry</span>
                            )}
                          </span>
                          <span className="flex flex-col items-end text-xs text-zinc-500">
                            <span
                              className={
                                unavailable ? 'text-zinc-400' : 'font-medium text-zinc-900'
                              }
                            >
                              {rateDisplay}{' '}
                              {indicative && !unavailable && (
                                <span className="text-amber-600">(indicative)</span>
                              )}
                            </span>
                            <span>{BAND_LABEL[row.expiryBand] ?? row.expiryBand}</span>
                          </span>
                        </button>

                        {boardOpenListingId === row.id && (
                          <div className="mt-3 flex flex-col gap-2 rounded bg-zinc-50 p-3 text-sm">
                            <p className="text-xs text-zinc-500">
                              {row.productName} — {row.packLabel}
                            </p>
                            <p>
                              Our offer rate: <strong>{rateDisplay}</strong>
                              {qty && !unavailable && row.boxValuePaise !== null && (
                                <span className="text-zinc-500">
                                  {' '}
                                  · lot value {formatPaiseAsINR(row.boxValuePaise)} × {qty} boxes
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Expiry: {BAND_LABEL[row.expiryBand] ?? row.expiryBand}
                            </p>
                            <p className="text-xs text-zinc-500">
                              MOQ: {row.moqBoxes} boxes · Boxes available: {row.quantityBoxes}
                            </p>
                            <label className="text-xs text-zinc-600">
                              Ask quantity (boxes)
                              <QuantityStepper
                                ariaLabel="Ask quantity (boxes)"
                                value={qty}
                                onChange={(v) => setBoardAskQty((q) => ({ ...q, [row.id]: v }))}
                                min={row.moqBoxes}
                              />
                            </label>
                            {qty !== undefined && qty < row.moqBoxes && (
                              <p className="text-xs text-red-600">
                                Below MOQ — minimum {row.moqBoxes} boxes
                              </p>
                            )}
                            {qty !== undefined && qty > row.quantityBoxes && (
                              <p className="text-xs text-amber-600">
                                Above listed stock, seller may supply less
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => void wantsIt(row)}
                              disabled={
                                unavailable || !Number.isInteger(qty) || (qty ?? 0) < row.moqBoxes
                              }
                              className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            >
                              He wants it
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setNotOnBoardOpen((o) => !o)}
                  className="self-start text-xs text-zinc-500 underline"
                >
                  Not on the board? Ask for it
                </button>

                {notOnBoardOpen && (
                  <div className="flex flex-col gap-2 rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
                    <div className="text-xs text-zinc-600">
                      Product
                      <div className="mt-1 flex flex-wrap gap-2">
                        {skus.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setNotOnBoardSkuId(s.id)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs ${
                              notOnBoardSkuId === s.id
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-300 bg-white text-zinc-700'
                            }`}
                          >
                            <div className="font-medium">{s.productName}</div>
                            <div
                              className={
                                notOnBoardSkuId === s.id ? 'text-zinc-300' : 'text-zinc-400'
                              }
                            >
                              {s.packLabel}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="text-xs text-zinc-600">
                      Ask quantity (boxes)
                      <QuantityStepper
                        ariaLabel="Not on the board quantity"
                        value={notOnBoardQty}
                        onChange={setNotOnBoardQty}
                      />
                    </label>
                    {notOnBoardError && <p className="text-xs text-red-600">{notOnBoardError}</p>}
                    <button
                      type="button"
                      onClick={() => void submitNotOnBoard()}
                      disabled={!notOnBoardSkuId || !notOnBoardQty}
                      className="self-start rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {funnels.map((f) => {
          const rows = trades.filter((t) => stageOf(t) === f.key);
          const lateCount = rows.filter((t) => slaOf(t.due)?.overdue).length;
          const isOpen = expanded.has(f.key);
          return (
            <div
              key={f.key}
              className="rounded border border-zinc-200 bg-white"
              data-testid={`stage-${f.key}`}
            >
              <button
                type="button"
                onClick={() => toggle(f.key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-zinc-900">
                    {f.label}{' '}
                    {lateCount > 0 && (
                      <span className="ml-1 text-xs font-semibold text-red-600">
                        {lateCount} late
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-400">{f.subtitle}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600"
                    data-testid="stage-count"
                  >
                    {rows.length}
                  </span>
                  <span
                    className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100">
                  {rows.length === 0 && (
                    <p className="px-4 py-3 text-sm text-zinc-400">Nothing here.</p>
                  )}
                  {rows.map((t) => {
                    const sla = slaOf(t.due);
                    return (
                      <div key={t.id}>
                        <button
                          type="button"
                          onClick={() => setOpenRowId(openRowId === t.id ? null : t.id)}
                          className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-sm"
                          data-testid="trade-row"
                        >
                          <span>
                            {t.party && <strong>{t.party.firmName}</strong>}
                            {t.party && ' · '}
                            {t.productName}
                            {t.packLabel ? ` — ${t.packLabel}` : ''} ·{' '}
                            {t.expiryMonth ? `Expiry ${t.expiryMonth}` : 'Expiry —'}
                          </span>
                          {sla && (
                            <span
                              className={
                                sla.overdue
                                  ? 'text-xs text-red-600'
                                  : sla.amber
                                    ? 'text-xs text-amber-600'
                                    : 'text-xs text-zinc-500'
                              }
                            >
                              {sla.label}
                            </span>
                          )}
                        </button>
                        {openRowId === t.id && (
                          <div className="px-4 pb-3">
                            <div className="flex flex-col gap-2 rounded bg-zinc-50 p-3">
                              <TradePopup id={t.id} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
