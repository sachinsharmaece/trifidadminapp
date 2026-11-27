import { useState } from 'react';
import { useParams } from 'react-router';
import { ChainStrip, chainOfPo } from '@/components/ref/ChainStrip';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { todayInIndia } from '@/utils/format';

interface PoLine {
  lineNo: number;
  productName: string;
  packLabel: string;
  boxes: number;
  landedPaisePerUnit: number;
}
interface PurchaseOrder {
  id: string;
  number: string;
  type: 'TRADE' | 'STOCK';
  approvalStatus: 'PENDING_APPROVAL' | 'ISSUED';
  status: string;
  salesOrderNumber: string | null;
  tradeId?: string;
  seller: { firmName: string };
  payable: {
    payable: boolean;
    gates: { arrived: boolean; inspected: boolean; billed: boolean };
    reasons: string[];
  } | null;
  lines: PoLine[];
  leg1?: { mode: string; dispatchedOn: string } | null;
  margBill?: { invoiceNumber: string; matched: boolean } | null;
  leg2Dispatched?: boolean;
  dispatchDueDate?: string;
}

const MODE_LABEL: Record<string, string> = { TRANSPORT: 'TRANSPORT', BUS: 'BUS', DEPOT: 'DEPOT' };

/**
 * Purchase → a purchase order, as the reference (app/(purchase)/purchase-orders/[id]): the chain strip, the lines,
 * "Is this PO payable?" and the leg-1 dispatch form (our "Record dispatch" on the trade, dated today).
 */
export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [mode, setMode] = useState<'TRANSPORT' | 'BUS'>('TRANSPORT');
  const [transporterName, setTransporterName] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [freightTerms, setFreightTerms] = useState<'PAID' | 'TO_PAY'>('PAID');
  const [freightAmount, setFreightAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(po?.number ?? 'Purchase order');

  async function load() {
    const data = await refGet<{ purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}`);
    setPo(data.purchaseOrder);
  }

  useOnMount(load);

  async function dispatchLeg1() {
    if (!po?.tradeId) return;
    setError(null);
    const { trade } = await refGet<{ trade: { version: number } }>(`/trades/${po.tradeId}`);
    const freight = Math.round(Number(freightAmount || 0) * 100);
    const res = await refSend('POST', `/trades/${po.tradeId}/actions/recordDispatch`, {
      version: trade.version,
      mode,
      ...(mode === 'TRANSPORT'
        ? { transporter: transporterName || undefined, lrNumber: lrNumber || undefined }
        : {
            busDetails: busNumber || undefined,
            driverName: driverName || undefined,
            driverMobile: driverMobile || undefined,
          }),
      freightTerms,
      ...(freightTerms === 'TO_PAY' && freight > 0 ? { freightPaise: freight } : {}),
      dispatchedOn: todayInIndia(),
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  if (!po) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  const gates = po.payable?.gates;
  const chain = chainOfPo({
    arrived: Boolean(gates?.arrived),
    inspected: Boolean(gates?.inspected),
    billed: Boolean(gates?.billed),
    marg: Boolean(po.margBill),
    leg2: Boolean(po.leg2Dispatched),
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">{po.number}</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {po.type === 'STOCK' ? 'Stock PO' : po.salesOrderNumber} · {po.seller.firmName}
      </p>

      {po.type === 'TRADE' && (
        <div className="mb-4">
          <ChainStrip currentStage={chain.current} completedStages={chain.completed} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2">
        {po.lines.map((l) => (
          <div key={l.lineNo} className="rounded border border-zinc-200 p-3 text-sm">
            {l.productName} — {l.packLabel} · {l.boxes} boxes ·{' '}
            {formatPaiseAsINR(l.landedPaisePerUnit)} per unit
          </div>
        ))}
      </div>

      {po.type === 'STOCK' ? (
        <div className="mb-4 rounded border border-zinc-200 p-3 text-sm">
          <p className="mb-1 font-medium text-zinc-900">Status</p>
          <p className={po.approvalStatus === 'ISSUED' ? 'text-emerald-700' : 'text-amber-700'}>
            {po.approvalStatus === 'ISSUED' ? 'Issued' : 'Pending approval by the Controller'}
            {po.dispatchDueDate ? ` · dispatch due ${po.dispatchDueDate}` : ''}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded border border-zinc-200 p-3 text-sm">
            <p className="mb-1 font-medium text-zinc-900">Is this PO payable?</p>
            <p className={po.payable?.payable ? 'text-emerald-700' : 'text-zinc-600'}>
              {po.payable?.payable ? 'Yes' : `No: ${(po.payable?.reasons ?? []).join(', ')}`}
            </p>
          </div>

          {!po.leg1 ? (
            po.status === 'RAISED' && (
              <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-900">Leg 1 dispatch</p>
                <select
                  aria-label="Mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'TRANSPORT' | 'BUS')}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="TRANSPORT">Transport</option>
                  <option value="BUS">Bus</option>
                </select>
                {mode === 'TRANSPORT' ? (
                  <>
                    <input
                      placeholder="Transporter name"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="LR number"
                      value={lrNumber}
                      onChange={(e) => setLrNumber(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </>
                ) : (
                  <>
                    <input
                      placeholder="Bus number"
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Driver name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Driver mobile (10 digits)"
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </>
                )}
                <select
                  aria-label="Freight"
                  value={freightTerms}
                  onChange={(e) => setFreightTerms(e.target.value as 'PAID' | 'TO_PAY')}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="PAID">Freight paid</option>
                  <option value="TO_PAY">Freight to-pay</option>
                </select>
                <input
                  placeholder="Freight amount ₹"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value)}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={() => void dispatchLeg1()}
                  className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Record leg-1 dispatch
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-zinc-600">
              Leg 1 dispatched ({MODE_LABEL[po.leg1.mode] ?? po.leg1.mode})
            </p>
          )}

          {po.margBill && (
            <p className="mt-3 text-sm text-zinc-600">
              Marg: {po.margBill.invoiceNumber} {po.margBill.matched ? '(matched)' : ''}
            </p>
          )}
          {po.leg2Dispatched && <p className="mt-1 text-sm text-zinc-600">Leg 2 dispatched</p>}
        </>
      )}
    </div>
  );
}
