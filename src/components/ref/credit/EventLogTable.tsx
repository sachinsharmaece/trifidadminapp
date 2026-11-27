import { useEffect, useState } from 'react';
import { refGet } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';

interface EventRow {
  id: string;
  at: string;
  category: string;
  action: string;
  by: string;
  party: string | null;
  newValue: unknown;
  reason: string | null;
}

/**
 * The credit log, copied from the reference (components/credit/EventLogTable.tsx): every credit (and listing
 * auto-confirm) event, permanent. Our API: GET /event-log?category=. Download saves a CSV made in the browser.
 */
export function EventLogTable() {
  const [category, setCategory] = useState<'' | 'CREDIT' | 'LISTING'>('CREDIT');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    refGet<{ events: EventRow[] }>('/event-log', category ? { category } : undefined)
      .then((data) => {
        if (live) {
          setError(null);
          setEvents(data.events ?? []);
        }
      })
      .catch(() => {
        if (live) setError('Could not load the event log.');
      });
    return () => {
      live = false;
    };
  }, [category]);

  const detailOf = (e: EventRow) => e.reason ?? (e.newValue ? JSON.stringify(e.newValue) : '');

  function download() {
    const cell = (text: string) => `"${text.replace(/"/g, '""')}"`;
    const rows = [
      ['When', 'Party', 'Event', 'By', 'Detail'],
      ...events.map((e) => [formatDateIST(e.at, true), e.party ?? '', e.action, e.by, detailOf(e)]),
    ];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' }),
    );
    link.download = 'credit-log.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Credit log</h2>
        <button
          type="button"
          onClick={download}
          className="min-h-11 rounded border border-zinc-300 px-3 text-xs"
        >
          Download
        </button>
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Every credit event, permanent. Nobody can edit or delete a line.
      </p>
      <select
        aria-label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value as '' | 'CREDIT' | 'LISTING')}
        className="mb-2 min-h-11 rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        <option value="">All (Credit + Listing)</option>
        <option value="CREDIT">Credit</option>
        <option value="LISTING">Listing (auto-confirm)</option>
      </select>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded border border-zinc-100">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-zinc-400">
            <tr>
              <th className="px-2 py-1 text-left">When</th>
              <th className="px-2 py-1 text-left">Party</th>
              <th className="px-2 py-1 text-left">Event</th>
              <th className="px-2 py-1 text-left">By</th>
              <th className="px-2 py-1 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-zinc-100">
                <td className="px-2 py-1 font-mono">{formatDateIST(e.at, true)}</td>
                <td className="px-2 py-1">{e.party ?? '—'}</td>
                <td className="px-2 py-1">{e.action}</td>
                <td className="px-2 py-1">{e.by}</td>
                <td className="px-2 py-1 text-zinc-500">{detailOf(e)}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-center text-zinc-400">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
