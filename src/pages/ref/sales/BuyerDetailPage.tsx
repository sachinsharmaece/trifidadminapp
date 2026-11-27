import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { tierLabel } from '@/lib/refLabels';
import { formatDateIST } from '@/lib/refMoney';
import { tehsilText, type RefBuyer } from './salesTypes';

interface Manufacturer {
  id: string;
  name: string;
  active: boolean;
}

/**
 * Sales → a buyer, as the reference (app/(sales)/buyers/[id]): his details and his companies (dealerships). The
 * reference's "Push to Purchase" sell-lead button comes with build R8 and the portal login panel with build R9.
 */
export function BuyerDetailPage() {
  const { id = '' } = useParams();
  const [buyer, setBuyer] = useState<RefBuyer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [dealershipError, setDealershipError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  useDocumentTitle(buyer?.firmName ?? 'Buyer');

  useOnMount(async () => {
    const res = await refGet<{ buyer: RefBuyer }>(`/buyers/${id}`).catch(() => null);
    if (!res) {
      setNotFound(true);
      return;
    }
    const m = await refGet<{ manufacturers: Manufacturer[] }>('/manufacturers');
    setBuyer(res.buyer);
    setAllManufacturers((m.manufacturers ?? []).filter((x) => x.active));
  });

  if (notFound) return <div className="p-8 text-sm text-zinc-500">Buyer not found.</div>;
  if (!buyer) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;

  const dealerIds = new Set(buyer.manufacturerIds);
  const [mobile, alternate] = buyer.mobiles;

  async function addDealership(manufacturerId: string) {
    if (!buyer) return;
    setDealershipError(null);
    setAdding(manufacturerId);
    const res = await refSend<{ buyer: RefBuyer }>('PATCH', `/buyers/${id}`, {
      manufacturerIds: [...buyer.manufacturerIds, manufacturerId],
    });
    setAdding(null);
    if (!res.ok) {
      setDealershipError(res.message);
      return;
    }
    setBuyer(res.data.buyer);
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">{buyer.firmName}</h1>
        <Link
          to={`/buyer-funnels?q=${encodeURIComponent(buyer.number)}`}
          className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        >
          Open funnel
        </Link>
      </div>

      <dl className="mb-6 grid grid-cols-[160px_1fr] gap-y-2 rounded border border-zinc-200 p-4 text-sm">
        <dt className="text-zinc-500">Contact person</dt>
        <dd>{buyer.contactName}</dd>
        <dt className="text-zinc-500">GSTIN</dt>
        <dd>{buyer.gstin || <span className="text-zinc-400">No GSTIN (B2C)</span>}</dd>
        <dt className="text-zinc-500">Mobile</dt>
        <dd>
          {mobile}
          {alternate && <span className="ml-2 text-zinc-500">alt: {alternate}</span>}
        </dd>
        <dt className="text-zinc-500">Tehsil</dt>
        <dd>{tehsilText(buyer.tehsil)}</dd>
        {buyer.village && (
          <>
            <dt className="text-zinc-500">Village</dt>
            <dd>{buyer.village}</dd>
          </>
        )}
        <dt className="text-zinc-500">Address</dt>
        <dd>{buyer.address}</dd>
        <dt className="text-zinc-500">Trade position</dt>
        <dd>{tierLabel(buyer.tradePosition)}</dd>
        <dt className="text-zinc-500">Trader</dt>
        <dd>{buyer.traderFlag ? 'Yes' : 'No'}</dd>
        <dt className="text-zinc-500">Rate tier</dt>
        <dd>
          {tierLabel(buyer.rateTier)}{' '}
          {!buyer.classified && <span className="text-xs text-amber-600">(indicative)</span>}
        </dd>
        <dt className="text-zinc-500">Delivery location</dt>
        <dd>{buyer.deliveryLocation}</dd>
        <dt className="text-zinc-500">Registered</dt>
        <dd>{formatDateIST(buyer.createdAt)}</dd>
      </dl>

      <div className="rounded border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Companies (dealership)</h2>
        <div className="flex flex-col divide-y divide-zinc-100">
          {allManufacturers.map((m) => {
            const assigned = dealerIds.has(m.id);
            return (
              <label key={m.id} className="flex items-center gap-3 py-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={assigned}
                  disabled={assigned || adding === m.id}
                  onChange={() => !assigned && void addDealership(m.id)}
                  className="h-5 w-5"
                />
                {m.name}
              </label>
            );
          })}
          {allManufacturers.length === 0 && (
            <p className="py-2 text-sm text-zinc-400">No manufacturers set up yet.</p>
          )}
        </div>
        {dealershipError && <p className="mt-1 text-xs text-red-600">{dealershipError}</p>}
      </div>
    </div>
  );
}
