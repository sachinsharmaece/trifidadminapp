import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import type { RefBuyer } from './salesTypes';

/** A deal the seller has confirmed and the buyer has not ordered yet (b4 / b5): the reference's "confirmed take". */
interface Take {
  id: string;
  version: number;
  buyerStage: string;
  productName: string;
  packLabel: string | null;
  confirmedBoxes: number | null;
  boxesWanted: number | null;
}

/**
 * Sales → Raise a sales order, as the reference (app/(sales)/sales-orders/new): pick the buyer, tick his confirmed
 * takes, choose insurance. In our system each confirmed deal becomes its own sales order ("Buyer says yes"), so
 * ticking two raises two orders; you land on the first one.
 */
export function NewSalesOrderPage() {
  useDocumentTitle('Raise a sales order');
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<RefBuyer[]>([]);
  const [buyerId, setBuyerId] = useState<string | undefined>(undefined);
  const [available, setAvailable] = useState<Take[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [insuranceElected, setInsuranceElected] = useState(true);
  const [insuranceDeclineReason, setInsuranceDeclineReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useOnMount(async () => {
    const data = await refGet<{ buyers: RefBuyer[] }>('/buyers', { pageSize: 100, active: 'true' });
    setBuyers(data.buyers ?? []);
  });

  const buyer = buyers.find((b) => b.id === buyerId);

  useEffect(() => {
    if (!buyer) return;
    let cancelled = false;
    void refGet<{ trades: Take[] }>('/trades/buyer-side', { q: buyer.number, pageSize: 100 }).then(
      (data) => {
        if (cancelled) return;
        setSelected(new Set());
        setAvailable(
          (data.trades ?? []).filter(
            (t) => t.buyerStage === 'B4_SEND_CONFIRMATION' || t.buyerStage === 'B5_BUYERS_CALL',
          ),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [buyer]);

  const buyerOptions: NamePickerOption[] = buyers.map((b) => ({ id: b.id, label: b.firmName }));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submit() {
    setErrors({});
    if (!buyerId) {
      setErrors({ buyerId: 'Select a buyer' });
      return;
    }
    if (selected.size === 0) {
      setErrors({ confirmationIds: 'Select at least one confirmed take' });
      return;
    }
    if (!insuranceElected && !insuranceDeclineReason) {
      setErrors({ insuranceDeclineReason: 'A reason is required when insurance is declined' });
      return;
    }
    setSubmitting(true);
    let firstOrderId: string | null = null;
    try {
      for (const take of available.filter((t) => selected.has(t.id))) {
        let version = take.version;
        if (take.buyerStage === 'B4_SEND_CONFIRMATION') {
          const sent = await refSend<{ trade: { version: number } }>(
            'POST',
            `/trades/${take.id}/actions/sendToBuyer`,
            { version },
          );
          if (!sent.ok) {
            setErrors({ _form: sent.message });
            return;
          }
          version = sent.data.trade.version;
        }
        const yes = await refSend<{ trade: { salesOrder?: { id: string } | null } }>(
          'POST',
          `/trades/${take.id}/actions/buyerYes`,
          {
            version,
            insuranceElected,
            ...(insuranceElected ? {} : { insuranceDeclineReason }),
          },
        );
        if (!yes.ok) {
          setErrors({ [yes.field ?? '_form']: yes.message });
          return;
        }
        firstOrderId ??= yes.data.trade.salesOrder?.id ?? null;
      }
    } finally {
      setSubmitting(false);
    }
    void navigate(firstOrderId ? `/sales-orders/${firstOrderId}` : '/sales-orders');
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Raise a sales order</h1>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Buyer
          <NamePicker
            ariaLabel="Buyer"
            options={buyerOptions}
            value={buyerId}
            onChange={setBuyerId}
            placeholder="Search buyer…"
          />
          {errors.buyerId && <p className="text-xs text-red-600">{errors.buyerId}</p>}
        </label>

        {buyerId && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-700">Confirmed takes for this buyer</p>
            {available.length === 0 && (
              <p className="text-sm text-zinc-500">
                Nothing confirmed and unordered for this buyer yet.
              </p>
            )}
            {available.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 rounded border border-zinc-200 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-5 w-5"
                />
                <span>
                  {c.productName || 'Unknown product'} {c.packLabel ? `— ${c.packLabel}` : ''} ·{' '}
                  {c.confirmedBoxes ?? c.boxesWanted ?? 0} boxes
                </span>
              </label>
            ))}
            {errors.confirmationIds && (
              <p className="text-xs text-red-600">{errors.confirmationIds}</p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={insuranceElected}
            onChange={(e) => setInsuranceElected(e.target.checked)}
            className="h-5 w-5"
          />
          Insurance elected
        </label>
        {!insuranceElected && (
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Reason for declining insurance
            <input
              value={insuranceDeclineReason}
              onChange={(e) => setInsuranceDeclineReason(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            {errors.insuranceDeclineReason && (
              <p className="text-xs text-red-600">{errors.insuranceDeclineReason}</p>
            )}
          </label>
        )}

        {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Raising…' : 'Raise sales order'}
        </button>
      </div>
    </div>
  );
}
