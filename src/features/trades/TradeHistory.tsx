import { formatDateTime } from '@/utils/format';
import type { Trade } from './api';

/** Every step of the trade, oldest first. Each person sees only the notes of their side of the wall. */
export function TradeHistory({ history }: { history: Trade['history'] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">History</h2>
      <ol className="mt-3 space-y-3">
        {history.map((line, index) => (
          <li key={index} className="border-l-2 border-slate-200 pl-3 text-sm">
            <div className="font-medium text-slate-900">{line.label}</div>
            <div className="text-xs text-slate-500">
              {formatDateTime(line.at)} · {line.by}
            </div>
            {line.buyerNote && <div className="text-slate-700">{line.buyerNote}</div>}
            {line.sellerNote && <div className="text-slate-700">{line.sellerNote}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
