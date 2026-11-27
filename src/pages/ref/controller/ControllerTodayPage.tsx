import { useState } from 'react';
import { Link } from 'react-router';
import type { CreditRequestRow } from '@/components/ref/credit/creditTypes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import type { RefPoRow } from '../purchase/refTypes';

/**
 * Controller → Today, as the reference (app/(controller)/controller-today): the two approval queues that are the
 * Controller's job — Controller-route credit requests (approve, or reject with a reason) and Stock POs waiting for
 * approval. TM-route requests live on the Sales Today page.
 */
export function ControllerTodayPage() {
  useDocumentTitle('Today');
  const [requests, setRequests] = useState<CreditRequestRow[]>([]);
  const [stockPos, setStockPos] = useState<RefPoRow[]>([]);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [reqData, poData] = await Promise.all([
      refGet<{ requests: CreditRequestRow[] }>('/credit/requests', { scope: 'toApprove' }),
      refGet<{ purchaseOrders: RefPoRow[] }>('/purchase-orders', { type: 'STOCK' }),
    ]);
    setRequests((reqData.requests ?? []).filter((r) => r.route === 'CONTROLLER'));
    setStockPos(
      (poData.purchaseOrders ?? []).filter((p) => p.approvalStatus === 'PENDING_APPROVAL'),
    );
  }
  useOnMount(load);

  async function act(path: string, body: object = {}) {
    setError(null);
    const res = await refSend('POST', path, body);
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    await load();
    return true;
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      setError('A reason is required');
      return;
    }
    if (await act(`/credit/requests/${id}/reject`, { reason: rejectReason.trim() })) {
      setRejecting(null);
      setRejectReason('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Today</h1>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Credit requests — Controller route
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded border border-zinc-200 bg-white p-3 text-sm"
            data-testid="credit-request"
          >
            <div className="flex items-center justify-between">
              <strong>{r.party.name}</strong>
              <span className="font-mono text-xs text-zinc-400">{r.number}</span>
            </div>
            <p className="text-xs text-zinc-600">
              {formatPaiseAsINR(r.fromLimitPaise)} → {formatPaiseAsINR(r.toLimitPaise)} · {r.days}{' '}
              days · Reference {r.reference.name} · by {r.requestedBy}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {r.checks
                .filter((c) => c.result !== 'ok')
                .map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700"
                  >
                    {c.label}: {c.detail}
                  </span>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void act(`/credit/requests/${r.id}/approve`)}
                className="min-h-11 rounded bg-zinc-900 px-3 text-xs font-medium text-white"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setRejecting(rejecting === r.id ? null : r.id)}
                className="min-h-11 rounded border border-zinc-300 px-3 text-xs"
              >
                Reject
              </button>
            </div>
            {rejecting === r.id && (
              <div className="mt-2 flex gap-2">
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (required)"
                  className="min-h-11 flex-1 rounded border border-zinc-300 px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void reject(r.id)}
                  className="min-h-11 rounded bg-red-700 px-3 text-xs font-medium text-white"
                >
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-zinc-400">Nothing waiting.</p>}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Stock POs — waiting for approval
      </h2>
      <div className="flex flex-col gap-2">
        {stockPos.map((po) => (
          <div
            key={po.id}
            className="flex items-center justify-between rounded border border-zinc-200 bg-white p-3 text-sm"
          >
            <Link to={`/purchase-orders/${po.id}`}>
              <strong>{po.number}</strong> · {po.seller.firmName}
            </Link>
            <button
              type="button"
              onClick={() => void act(`/purchase-orders/${po.id}/approve`)}
              className="min-h-11 rounded bg-zinc-900 px-3 text-xs font-medium text-white"
            >
              Approve
            </button>
          </div>
        ))}
        {stockPos.length === 0 && <p className="text-sm text-zinc-400">Nothing waiting.</p>}
      </div>
    </div>
  );
}
