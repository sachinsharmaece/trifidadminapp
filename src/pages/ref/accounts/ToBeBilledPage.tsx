import { useState } from 'react';
import { uploadFile } from '@/components/ref/FileField';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR, todayIST } from '@/lib/refMoney';
import { RulesBox } from './RulesBox';

/**
 * To be billed, copied from the reference (app/(accounts)/to-be-billed). Orders that are paid and whose goods the dock
 * has checked. Accounts types each into Marg and keys the bill number and PDF back.
 *
 * Our API: GET /to-be-billed; POST /uploads (the PDF); POST /to-be-billed/:salesOrderId/marg-bill
 * { version, invoiceNumber, pdfFileId, billDate (today), totalPaise, lines: [{ lineNo, boxes }] }. The total is worked out
 * from the billed boxes at the order's rate, as in the reference.
 */
interface Line {
  lineNo: number;
  productName: string;
  packLabel: string;
  unitsPerBox: number;
  acceptedBoxes: number;
  buyerRatePaisePerUnit: number;
  acceptedValuePaise: number;
}
interface BillRow {
  salesOrderId: string;
  number: string;
  tradeVersion: number | null;
  buyer: { number: string; firmName: string };
  accepted: { lines: Line[]; expectedPaise: number } | null;
}

const RULES = [
  'Only orders that are paid and inspection-passed appear here.',
  "Bill only accepted boxes, at the order's rate. Rate is per unit, tax-inclusive.",
  'One bill per buyer. Marg bill number + PDF required.',
  'Once saved, the order goes to Logistics for dispatch.',
];

export function ToBeBilledPage() {
  const [rows, setRows] = useState<BillRow[]>([]);
  const [billNo, setBillNo] = useState<Record<string, string>>({});
  const [file, setFile] = useState<Record<string, File | null>>({});
  const [billedBoxes, setBilledBoxes] = useState<Record<string, Record<number, string>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function load() {
    const res = await refGet<{ rows: BillRow[] }>('/to-be-billed', { pageSize: 100 });
    setRows(res.rows);
  }

  useOnMount(load);

  function boxesFor(soId: string, line: Line) {
    return billedBoxes[soId]?.[line.lineNo] ?? String(line.acceptedBoxes);
  }

  function fail(id: string, message: string) {
    setErrors((e) => ({ ...e, [id]: message }));
  }

  async function saveBill(row: BillRow) {
    const id = row.salesOrderId;
    fail(id, '');
    const no = billNo[id]?.trim();
    const pdf = file[id];
    if (!no) return fail(id, 'Marg bill number is required');
    if (!pdf) return fail(id, 'Marg bill PDF is required');
    setBusyId(id);
    let pdfFileId: string;
    try {
      pdfFileId = await uploadFile(pdf);
    } catch (error) {
      setBusyId(null);
      return fail(id, error instanceof Error ? error.message : 'Upload failed');
    }
    const lines = (row.accepted?.lines ?? []).map((l) => ({
      lineNo: l.lineNo,
      boxes: Number(boxesFor(id, l)) || 0,
    }));
    const totalPaise = (row.accepted?.lines ?? []).reduce(
      (sum, l) => sum + (Number(boxesFor(id, l)) || 0) * l.unitsPerBox * l.buyerRatePaisePerUnit,
      0,
    );
    const res = await refSend('POST', `/to-be-billed/${id}/marg-bill`, {
      version: row.tradeVersion ?? 0,
      invoiceNumber: no,
      pdfFileId,
      billDate: todayIST(),
      totalPaise,
      lines,
    });
    setBusyId(null);
    if (!res.ok) return fail(id, res.message);
    setDone((d) => ({ ...d, [id]: true }));
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">To be billed</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Every order that is <b>paid</b> and whose goods have <b>passed inspection</b>. Type it into
        Marg, key the bill number back.
      </p>

      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const id = row.salesOrderId;
          return (
            <div key={id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold">{row.number}</span>{' '}
                  <span className="font-medium">{row.buyer.firmName}</span>
                  <span className="ml-2 text-xs text-zinc-400">{row.buyer.number}</span>
                </div>
                <span className="text-sm font-semibold">
                  {formatPaiseAsINR(row.accepted?.expectedPaise ?? 0)}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="py-1 text-left">Goods</th>
                    <th className="py-1 text-right">Units/box</th>
                    <th className="py-1 text-right">Rate/unit</th>
                    <th className="py-1 text-right">Accepted boxes</th>
                    <th className="py-1 text-right">Billed boxes</th>
                    <th className="py-1 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.accepted?.lines ?? []).map((l) => (
                    <tr key={l.lineNo} className="border-t border-zinc-100">
                      <td className="py-1">
                        {l.productName} · {l.packLabel}
                      </td>
                      <td className="py-1 text-right">{l.unitsPerBox}</td>
                      <td className="py-1 text-right">
                        {formatPaiseAsINR(l.buyerRatePaisePerUnit)}
                      </td>
                      <td className="py-1 text-right">{l.acceptedBoxes}</td>
                      <td className="py-1 text-right">
                        <input
                          aria-label={`Billed boxes ${row.number} line ${l.lineNo}`}
                          value={boxesFor(id, l)}
                          onChange={(e) =>
                            setBilledBoxes((b) => ({
                              ...b,
                              [id]: { ...b[id], [l.lineNo]: e.target.value },
                            }))
                          }
                          className="w-16 rounded border border-zinc-300 px-1 text-right"
                        />
                      </td>
                      <td className="py-1 text-right">{formatPaiseAsINR(l.acceptedValuePaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {done[id] ? (
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Billed · sent to Logistics
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Marg bill no."
                    value={billNo[id] ?? ''}
                    onChange={(e) => setBillNo((b) => ({ ...b, [id]: e.target.value }))}
                    className="min-h-11 w-44 rounded border border-zinc-300 px-2 text-sm"
                  />
                  <label className="flex min-h-11 items-center rounded border border-zinc-300 px-3 text-sm text-zinc-600">
                    {file[id]?.name ?? 'Choose PDF…'}
                    <input
                      aria-label={`Bill PDF ${row.number}`}
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const picked = e.target.files?.[0];
                        if (picked) setFile((f) => ({ ...f, [id]: picked }));
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busyId === id}
                    onClick={() => void saveBill(row)}
                    className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Save bill
                  </button>
                </div>
              )}
              {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
            Nothing here.
          </p>
        )}
      </div>

      <RulesBox rules={RULES} />
    </div>
  );
}
