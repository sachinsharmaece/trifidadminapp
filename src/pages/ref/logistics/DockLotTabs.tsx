import { useState } from 'react';
import { FileField, uploadFile } from '@/components/ref/FileField';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { refSend } from '@/lib/refApi';
import { Card, Pill, fmtDate, type DockLot } from './dockTypes';

type WithBusy = (fn: () => Promise<void>) => Promise<void>;

async function sendOrThrow(method: 'POST', path: string, body: object) {
  const res = await refSend(method, path, body);
  if (!res.ok) throw new Error(res.message);
}

/* ------------------------------- Coming ------------------------------- */

export function ComingTab({
  lots,
  busy,
  withBusy,
  reload,
}: {
  lots: DockLot[];
  busy: boolean;
  withBusy: WithBusy;
  reload: () => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [cases, setCases] = useState<number | undefined>(undefined);
  const [billWithGoods, setBillWithGoods] = useState(true);
  const [photoFileId, setPhotoFileId] = useState<string | null>(null);

  async function saveArrival(lot: DockLot) {
    if (!photoFileId) throw new Error('A photo is required');
    await sendOrThrow('POST', `/dock/${lot.purchaseOrderId}/arrival`, {
      version: lot.tradeVersion,
      arrivedAt: new Date().toISOString(),
      boxesCounted: cases ?? lot.boxes,
      billWithGoods,
    });
    await sendOrThrow('POST', `/dock/${lot.purchaseOrderId}/photos`, {
      kind: 'ARRIVAL',
      fileIds: [photoFileId],
    });
    setOpenId(null);
    setCases(undefined);
    setPhotoFileId(null);
    await reload();
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 text-xs text-zinc-500">On the road to Indore. Red after a few days.</p>
      {lots.length === 0 && <p className="text-sm text-zinc-400">Nothing on the road.</p>}
      {lots.map((lot) => (
        <Card key={lot.purchaseOrderId} highlight={openId === lot.purchaseOrderId}>
          <div className="flex items-start justify-between" data-testid="coming-lot">
            <div>
              <div className="text-base font-bold text-zinc-900">From {lot.from}</div>
              <div className="font-mono text-xs text-zinc-400">
                {lot.number} · left {fmtDate(lot.leg1?.at ?? null)}
              </div>
            </div>
            <div className="text-right text-base font-bold text-zinc-900">{lot.boxes} cases</div>
          </div>
          <Pill tone={lot.transitOverdue ? 'bad' : 'mu'}>
            {lot.transitOverdue
              ? `${lot.daysOnRoad ?? 0} days · overdue`
              : `${lot.daysOnRoad ?? 0} days`}
          </Pill>
          <dl className="grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-zinc-400">Mode</dt>
            <dd>{lot.leg1?.mode ?? '—'}</dd>
            {lot.leg1?.driverMobile && (
              <>
                <dt className="text-zinc-400">Driver</dt>
                <dd>{lot.leg1.driverMobile}</dd>
              </>
            )}
            {lot.leg1?.note && (
              <>
                <dt className="text-zinc-400">Note</dt>
                <dd>{lot.leg1.note}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-col gap-1 text-xs">
            {lot.lines.map((l) => (
              <div key={l.lineNo} className="rounded bg-zinc-50 px-2 py-1">
                {l.productName} · {l.packLabel} · {l.boxes} cases ·{' '}
                {l.batchDeclared ? (
                  <span className="font-mono">
                    {l.batchDeclared} · {l.expiryDeclared}
                  </span>
                ) : (
                  <span className="italic text-zinc-400">batch/expiry not declared</span>
                )}
                {l.shortExpiryAgreed && <Pill tone="warn">short expiry agreed</Pill>}
              </div>
            ))}
          </div>
          {openId === lot.purchaseOrderId ? (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Cases counted
                <QuantityStepper
                  ariaLabel="Cases counted"
                  min={0}
                  value={cases ?? lot.boxes}
                  onChange={setCases}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={billWithGoods}
                  onChange={(e) => setBillWithGoods(e.target.checked)}
                />
                Seller&apos;s bill came with goods
              </label>
              <FileField
                label="Truck / cases photo"
                accept="image/jpeg,image/png"
                capture
                fileName={photoFileId ? 'Photo selected' : null}
                onFile={(f) => void withBusy(async () => setPhotoFileId(await uploadFile(f)))}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withBusy(() => saveArrival(lot))}
                  className="min-h-11 flex-1 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save arrival
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="min-h-11 rounded border border-zinc-300 px-4 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpenId(lot.purchaseOrderId);
                setCases(lot.boxes);
                setPhotoFileId(null);
              }}
              className="min-h-11 rounded border border-zinc-300 text-sm font-medium"
            >
              Record arrival
            </button>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------- Arrived ------------------------------- */

export function ArrivedTab({
  lots,
  onInspect,
}: {
  lots: DockLot[];
  onInspect: (poId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 text-xs text-zinc-500">
        At the dock, not inspected. A short count carries into inspection automatically.
      </p>
      {lots.length === 0 && <p className="text-sm text-zinc-400">Nothing waiting at the dock.</p>}
      {lots.map((lot) => {
        const counted = lot.arrival?.boxesCounted ?? lot.boxes;
        const short = lot.boxes - counted;
        return (
          <Card key={lot.purchaseOrderId}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold text-zinc-900">From {lot.from}</div>
                <div className="font-mono text-xs text-zinc-400">{lot.number}</div>
              </div>
              <div className="text-right text-base font-bold text-zinc-900">{counted} cases</div>
            </div>
            {lot.inspectBy && <Pill tone="warn">Inspect by {fmtDate(lot.inspectBy)}</Pill>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-zinc-50 p-2">
                <div className="text-zinc-400">Expected</div>
                <div className="text-base font-semibold">{lot.boxes}</div>
              </div>
              <div className="rounded bg-zinc-50 p-2">
                <div className="text-zinc-400">Counted</div>
                <div className={`text-base font-semibold ${short > 0 ? 'text-red-600' : ''}`}>
                  {counted}
                </div>
              </div>
            </div>
            {short > 0 && (
              <Pill tone="warn">
                {short} cases short on arrival. Inspection will mark them Count short.
              </Pill>
            )}
            <button
              type="button"
              onClick={() => onInspect(lot.purchaseOrderId)}
              className="min-h-11 rounded bg-blue-700 text-sm font-semibold text-white"
            >
              Inspect
            </button>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------- Inspect ------------------------------- */

interface LineDraft {
  batchFound: string;
  expiryFound: string;
  damaged: number;
  leaking: number;
}

export function InspectTab({
  arrived,
  inspected,
  openPoId,
  setOpenPoId,
  busy,
  withBusy,
  reload,
}: {
  arrived: DockLot[];
  inspected: DockLot[];
  openPoId: string | null;
  setOpenPoId: (id: string | null) => void;
  busy: boolean;
  withBusy: WithBusy;
  reload: () => Promise<void>;
}) {
  const lot = [...arrived, ...inspected].find((l) => l.purchaseOrderId === openPoId);
  if (!openPoId || !lot) {
    return (
      <div className="flex flex-col gap-1">
        <p className="mb-2 text-xs text-zinc-500">Pick a lot that has arrived.</p>
        {arrived.length === 0 && inspected.length === 0 && (
          <p className="text-sm text-zinc-400">Nothing to inspect. Record arrival first.</p>
        )}
        {arrived.map((l) => (
          <Card key={l.purchaseOrderId}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold">From {l.from}</div>
                <div className="font-mono text-xs text-zinc-400">{l.number}</div>
              </div>
              <Pill tone="warn">Waiting</Pill>
            </div>
            <button
              type="button"
              onClick={() => setOpenPoId(l.purchaseOrderId)}
              className="min-h-11 rounded border border-zinc-300 text-sm font-medium"
            >
              Open
            </button>
          </Card>
        ))}
        {inspected.map((l) => (
          <Card key={l.purchaseOrderId}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold">From {l.from}</div>
                <div className="font-mono text-xs text-zinc-400">{l.number}</div>
              </div>
              <Pill tone="ok">Inspected</Pill>
            </div>
            <button
              type="button"
              onClick={() => setOpenPoId(l.purchaseOrderId)}
              className="min-h-11 rounded border border-zinc-300 text-sm font-medium"
            >
              View
            </button>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <InspectDetail
      key={lot.purchaseOrderId}
      lot={lot}
      setOpenPoId={setOpenPoId}
      busy={busy}
      withBusy={withBusy}
      reload={reload}
    />
  );
}

function InspectDetail({
  lot,
  setOpenPoId,
  busy,
  withBusy,
  reload,
}: {
  lot: DockLot;
  setOpenPoId: (id: string | null) => void;
  busy: boolean;
  withBusy: WithBusy;
  reload: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>(() =>
    Object.fromEntries(
      lot.lines.map((l) => [
        l.lineNo,
        {
          batchFound: l.batchDeclared ?? '',
          expiryFound: l.expiryDeclared ?? '',
          damaged: 0,
          leaking: 0,
        },
      ]),
    ),
  );
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const done = lot.result !== null;
  const counted = lot.arrival?.boxesCounted ?? lot.boxes;
  const totalShort = Math.max(0, lot.boxes - counted);

  const lineCalc = lot.lines.map((line, idx) => {
    const before = lot.lines.slice(0, idx).reduce((s, l) => s + l.boxes, 0);
    const autoShort = Math.min(totalShort, before + line.boxes) - Math.min(totalShort, before);
    const d = drafts[line.lineNo];
    const manual = (d?.damaged ?? 0) + (d?.leaking ?? 0);
    const accepted = Math.max(0, line.boxes - autoShort - manual);
    return { line, autoShort, accepted, rejected: autoShort + manual };
  });
  const acceptedTotal = lineCalc.reduce((s, l) => s + l.accepted, 0);
  const rejectedTotal = lineCalc.reduce((s, l) => s + l.rejected, 0);

  let outcome: { tone: 'ok' | 'bad' | 'warn'; title: string; points: string[] };
  if (acceptedTotal === lot.boxes) {
    outcome = {
      tone: 'ok',
      title: `${acceptedTotal} of ${lot.boxes} passed`,
      points: [
        'Seller s5→s6, buyer b7→b8 together.',
        'Seller paid in full.',
        'Accounts can enter the Marg bill.',
      ],
    };
  } else if (acceptedTotal === 0) {
    outcome = {
      tone: 'bad',
      title: `0 of ${lot.boxes} passed`,
      points: [
        'Nothing moves to b8. Seller side closes Dock rejected + a strike.',
        'Return note for cases present, due in 30 days.',
        'Full refund to the buyer queued. Sales can reopen.',
      ],
    };
  } else {
    outcome = {
      tone: 'warn',
      title: `${acceptedTotal} of ${lot.boxes} passed · ${rejectedTotal} rejected`,
      points: [
        `Seller paid for ${acceptedTotal} cases only.`,
        'Count-short: nothing to return. Damaged/leaking: return note, due in 30 days.',
        `Refund for ${rejectedTotal} cases queued; Marg bill may carry at most ${acceptedTotal} cases.`,
      ],
    };
  }

  async function saveInspection() {
    if (photoIds.length === 0) throw new Error('At least one photo is required');
    await sendOrThrow('POST', `/dock/${lot.purchaseOrderId}/inspection`, {
      version: lot.tradeVersion,
      lines: lot.lines.map((l) => {
        const d = drafts[l.lineNo];
        return {
          lineNo: l.lineNo,
          ...(d?.batchFound ? { batchFound: d.batchFound } : {}),
          ...(d?.expiryFound ? { expiryFound: d.expiryFound } : {}),
          damagedBoxes: d?.damaged ?? 0,
          leakingBoxes: d?.leaking ?? 0,
          excessBoxes: 0,
        };
      }),
      ...(note ? { note } : {}),
    });
    await sendOrThrow('POST', `/dock/${lot.purchaseOrderId}/photos`, {
      kind: 'INSPECTION',
      fileIds: photoIds,
    });
    setOpenPoId(null);
    await reload();
  }

  const setLine = (lineNo: number, patch: Partial<LineDraft>) =>
    setDrafts((p) => ({ ...p, [lineNo]: { ...p[lineNo], ...patch } }));

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpenPoId(null)}
        className="self-start text-xs text-zinc-500"
      >
        ← All lots
      </button>
      <div>
        <h2 className="text-base font-bold">
          Inspect <span className="font-mono">{lot.number}</span>
        </h2>
        <p className="text-xs text-zinc-500">
          From {lot.from} · arrived {fmtDate(lot.arrival?.arrivedAt ?? null)} · counted {counted}
        </p>
      </div>

      {done && lot.result && (
        <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-800">
          Inspection saved {fmtDate(lot.result.savedAt)}. Final.
        </div>
      )}

      {lineCalc.map(({ line, autoShort, accepted, rejected }) => {
        const d = drafts[line.lineNo];
        const saved = lot.result?.lines.find((il) => il.lineNo === line.lineNo);
        return (
          <Card key={line.lineNo}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{line.productName}</div>
              <Pill>{line.boxes} on PO</Pill>
            </div>
            <div className="text-xs text-zinc-500">
              On PO:{' '}
              {line.batchDeclared ? (
                <span className="font-mono">
                  {line.batchDeclared} · {line.expiryDeclared}
                </span>
              ) : (
                <span className="italic">not declared</span>
              )}
              {line.shortExpiryAgreed && (
                <span className="ml-1 font-semibold">· short expiry agreed</span>
              )}
            </div>
            {done ? (
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-zinc-400">Batch found</dt>
                <dd>{saved?.batchFound ?? '—'}</dd>
                <dt className="text-zinc-400">Expiry found</dt>
                <dd>{saved?.expiryFound ?? '—'}</dd>
              </dl>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs text-zinc-600">
                  Batch on cases
                  <input
                    value={d?.batchFound ?? ''}
                    onChange={(e) => setLine(line.lineNo, { batchFound: e.target.value })}
                    className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-600">
                  Expiry on cases (YYYY-MM)
                  <input
                    value={d?.expiryFound ?? ''}
                    placeholder="2028-06"
                    onChange={(e) => setLine(line.lineNo, { expiryFound: e.target.value })}
                    className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                  />
                </label>
              </>
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
              <span>
                Count short <Pill>auto from arrival</Pill>
              </span>
              <b>{saved?.boxesShort ?? autoShort}</b>
            </div>
            {(['damaged', 'leaking'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span>{key === 'damaged' ? 'External damage' : 'Leakage'}</span>
                {done ? (
                  <b>
                    {key === 'damaged' ? (saved?.boxesDamaged ?? 0) : (saved?.boxesLeaking ?? 0)}
                  </b>
                ) : (
                  <QuantityStepper
                    ariaLabel={`${key === 'damaged' ? 'External damage' : 'Leakage'} ${line.productName}`}
                    min={0}
                    max={line.boxes}
                    value={d?.[key] ?? 0}
                    onChange={(v) => setLine(line.lineNo, { [key]: v ?? 0 })}
                  />
                )}
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-zinc-50 p-2">
                <div className="text-zinc-400">On PO</div>
                <div className="font-semibold">{line.boxes}</div>
              </div>
              <div className="rounded bg-zinc-50 p-2">
                <div className="text-zinc-400">Rejected</div>
                <div className="font-semibold">
                  {done ? (saved ? saved.boxesOnPo - saved.boxesAccepted : 0) : rejected}
                </div>
              </div>
              <div className="rounded bg-zinc-50 p-2">
                <div className="text-zinc-400">Accepted</div>
                <div className="font-semibold text-emerald-700" data-testid="accepted">
                  {done ? saved?.boxesAccepted : accepted}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {!done && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Photos</span>
            <Pill tone={photoIds.length ? 'ok' : 'bad'}>
              {photoIds.length ? `${photoIds.length} added` : 'At least 1 needed'}
            </Pill>
          </div>
          <FileField
            label="Add photo"
            accept="image/jpeg,image/png"
            capture
            fileName={null}
            onFile={(f) =>
              void withBusy(async () => {
                const fileId = await uploadFile(f);
                setPhotoIds((p) => [...p, fileId]);
              })
            }
          />
        </Card>
      )}

      {!done && (
        <Card>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded border border-zinc-300 p-2 text-sm"
            />
          </label>
        </Card>
      )}

      <Card highlight>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">When you save</span>
          <Pill tone={outcome.tone}>{outcome.title}</Pill>
        </div>
        <ul className="list-disc pl-4 text-xs text-zinc-600">
          {outcome.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>

      {!done && (
        <button
          type="button"
          disabled={busy || photoIds.length === 0}
          onClick={() => void withBusy(saveInspection)}
          className="min-h-11 rounded bg-blue-700 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save inspection
        </button>
      )}
    </div>
  );
}
