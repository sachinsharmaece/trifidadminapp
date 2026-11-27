import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import type { CreditRequestRow } from './creditTypes';

/**
 * TM-route credit requests from his own team, on the Sales Today page (reference CreditRequestsForTM). The server
 * returns nothing for anyone who may not approve them, so it shows only for a TM with something waiting.
 */
export function CreditRequestsForTM() {
  const [requests, setRequests] = useState<CreditRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await refGet<{ requests: CreditRequestRow[] }>('/credit/requests', {
      scope: 'toApprove',
    });
    setRequests((res.requests ?? []).filter((r) => r.route === 'TM'));
  }
  useOnMount(load);

  async function approve(id: string) {
    setError(null);
    const res = await refSend('POST', `/credit/requests/${id}/approve`, {});
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  if (requests.length === 0) return null;
  return (
    <div className="mt-4 rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">Credit requests — your team</h2>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-2 text-sm"
          >
            <span>
              <strong>{r.party.name}</strong> · {formatPaiseAsINR(r.fromLimitPaise)} →{' '}
              {formatPaiseAsINR(r.toLimitPaise)} · {r.days} days · by {r.requestedBy}
            </span>
            <button
              type="button"
              onClick={() => void approve(r.id)}
              className="min-h-11 rounded bg-zinc-900 px-3 text-xs font-medium text-white"
            >
              Approve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
