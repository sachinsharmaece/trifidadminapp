import { useState } from 'react';
import { useParams } from 'react-router';
import { ChainStrip, type ChainStageKey } from '@/components/ref/ChainStrip';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { paymentWindow } from './salesTypes';

interface SalesOrder {
  id: string;
  number: string;
  status: string;
  tradeId: string;
  buyer: { firmName: string; deliveryLocation: string };
  lines: {
    lineNo: number;
    productName: string;
    packLabel: string;
    boxes: number;
    boxValuePaise: number;
  }[];
  totalPaise: number;
  paymentDueAt: string;
  margBill: unknown;
  purchaseOrder: { number: string; arrived: boolean; inspected: boolean; billed: boolean } | null;
}
interface ReasonCode {
  id: string;
  label: string;
  active: boolean;
}

/** The reference chain (lib/chain.ts) from our order's status and its PO. */
function chainOf(so: SalesOrder): { current: ChainStageKey; completed: ChainStageKey[] } {
  const completed: ChainStageKey[] = ['SO'];
  if (so.status === 'AWAITING_PAYMENT' || so.status === 'CANCELLED') {
    return { current: so.status === 'CANCELLED' ? 'SO' : 'PAYMENT', completed };
  }
  completed.push('PAYMENT');
  const po = so.purchaseOrder;
  if (!po) return { current: 'PO', completed };
  completed.push('PO');
  if (!(po.arrived && po.inspected && po.billed)) return { current: 'LEG1', completed };
  completed.push('LEG1');
  if (!so.margBill) return { current: 'MARG', completed };
  completed.push('MARG');
  if (so.status === 'DISPATCHED' || so.status === 'DELIVERED') completed.push('DISPATCH');
  return { current: 'DISPATCH', completed };
}

/**
 * Sales → a sales order, as the reference (app/(sales)/sales-orders/[id]). "Cancel overdue order" is our "Buyer
 * drops the order", which also needs one of the Buyer-dropped reason codes; "Confirm delivery" is "Delivered".
 */
export function SalesOrderDetailPage() {
  const { id = '' } = useParams();
  const [so, setSo] = useState<SalesOrder | null>(null);
  const [reasons, setReasons] = useState<ReasonCode[]>([]);
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  useDocumentTitle(so?.number ?? 'Sales order');

  async function load() {
    const data = await refGet<{ salesOrder: SalesOrder }>(`/sales-orders/${id}`);
    setSo(data.salesOrder);
  }

  useOnMount(async () => {
    await load();
    const r = await refGet<{ reasonCodes: ReasonCode[] }>('/reason-codes', { context: 'B6_LEAK' });
    setReasons((r.reasonCodes ?? []).filter((x) => x.active));
  });

  async function act(action: string, body: object) {
    if (!so) return false;
    setMessage(null);
    const { trade } = await refGet<{ trade: { version: number } }>(`/trades/${so.tradeId}`);
    const res = await refSend('POST', `/trades/${so.tradeId}/actions/${action}`, {
      version: trade.version,
      ...body,
    });
    if (!res.ok) {
      setMessage(res.message);
      return false;
    }
    await load();
    return true;
  }

  if (!so) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  const chain = chainOf(so);
  const window = so.status === 'AWAITING_PAYMENT' ? paymentWindow(so.paymentDueAt) : null;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">{so.number}</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {so.buyer.firmName} · {so.buyer.deliveryLocation}
      </p>

      <div className="mb-4">
        <ChainStrip currentStage={chain.current} completedStages={chain.completed} />
      </div>

      {message && <p className="mb-3 text-sm text-red-600">{message}</p>}

      <div className="mb-4 flex flex-col gap-2">
        {so.lines.map((l) => (
          <div key={l.lineNo} className="rounded border border-zinc-200 p-3 text-sm">
            {l.productName} — {l.packLabel} · {l.boxes} boxes · {formatPaiseAsINR(l.boxValuePaise)}
          </div>
        ))}
      </div>

      <p className="mb-4 text-sm font-medium text-zinc-900">
        Total: {formatPaiseAsINR(so.totalPaise)}
      </p>

      {window && (
        <p className={`mb-4 text-sm ${window.overdue ? 'text-red-600' : 'text-zinc-600'}`}>
          Payment window: {window.label}
        </p>
      )}

      {so.purchaseOrder && (
        <p className="mb-4 text-sm text-zinc-600">Purchase order: {so.purchaseOrder.number}</p>
      )}

      {so.status === 'AWAITING_PAYMENT' && (
        <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3">
          <p className="text-sm text-zinc-700">Cancel this overdue order</p>
          <select
            aria-label="Cancel reason code"
            value={reasonCodeId}
            onChange={(e) => setReasonCodeId(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              void act('leakAfterOrder', {
                reasonCodeId,
                ...(cancelReason ? { note: cancelReason } : {}),
              })
            }
            className="self-start rounded border border-red-300 px-3 py-1.5 text-xs text-red-700"
          >
            Cancel overdue order
          </button>
        </div>
      )}

      {so.status === 'DISPATCHED' && (
        <button
          type="button"
          onClick={() => void act('confirmDelivery', {})}
          className="mt-3 rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700"
        >
          Confirm delivery
        </button>
      )}
    </div>
  );
}
