import { EXPIRY_BAND_LABELS } from '@/types/listing';
import { formatRupees } from '@/utils/format';
import type { BoardRow } from './api';

interface BoardTableProps {
  rows: readonly BoardRow[];
  /** Mark every rate "indicative" (the buyer is not classified yet). */
  indicative: boolean;
}

/** The offers we can quote one buyer, with the buyer's rate for each. */
export function BoardTable({ rows, indicative }: BoardTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Product pack</th>
            <th className="px-4 py-3 font-medium">Our rate per unit</th>
            <th className="px-4 py-3 font-medium">Box value</th>
            <th className="px-4 py-3 font-medium">Minimum / available</th>
            <th className="px-4 py-3 font-medium">Shelf life</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                Nothing on the board for this buyer.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{row.productName}</div>
                <div className="text-xs text-slate-500">
                  {row.packLabel} · {row.unitsPerBox} per box
                  {row.manufacturerName && ` · ${row.manufacturerName}`}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {row.buyerRatePaisePerUnit === null ? (
                  <span className="text-xs font-medium text-amber-700">
                    Rate unavailable: margin cell missing
                  </span>
                ) : (
                  <>
                    <div className="font-medium text-slate-900">
                      {formatRupees(row.buyerRatePaisePerUnit)}
                    </div>
                    {indicative && <div className="text-xs text-slate-500">indicative</div>}
                  </>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {row.boxValuePaise === null ? '—' : formatRupees(row.boxValuePaise)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {row.moqBoxes} / {row.quantityBoxes} boxes
              </td>
              <td className="whitespace-nowrap px-4 py-3">{EXPIRY_BAND_LABELS[row.expiryBand]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
