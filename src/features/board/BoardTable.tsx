import { Button } from '@/components/atoms/Button';
import { EXPIRY_BAND_LABELS } from '@/types/listing';
import { formatRupees } from '@/utils/format';
import type { BoardRow } from './api';

interface BoardTableProps {
  rows: readonly BoardRow[];
  /** Mark every rate "indicative" (the buyer is not classified yet). */
  indicative: boolean;
  /** Sales only: open a row as a trade (deal card). Without it there is no Open button. */
  onOpen?: ((row: BoardRow) => void) | undefined;
  /** The row being opened right now (its button shows a spinner). */
  openingId?: string | null | undefined;
}

/** The offers we can quote one buyer, with the buyer's rate for each. */
export function BoardTable({ rows, indicative, onOpen, openingId }: BoardTableProps) {
  const columns = onOpen ? 6 : 5;
  return (
    // "relative" keeps the hidden "Open" header text inside this scroll box on narrow screens.
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Product pack</th>
            <th className="px-4 py-3 font-medium">Our rate per unit</th>
            <th className="px-4 py-3 font-medium">Box value</th>
            <th className="px-4 py-3 font-medium">Minimum / available</th>
            <th className="px-4 py-3 font-medium">Shelf life</th>
            {onOpen && (
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Open</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns} className="px-4 py-8 text-center text-slate-500">
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
              {onOpen && (
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={openingId === row.id}
                    disabled={Boolean(openingId)}
                    onClick={() => onOpen(row)}
                    aria-label={`Open ${row.productName} ${row.packLabel}`}
                  >
                    Open
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
