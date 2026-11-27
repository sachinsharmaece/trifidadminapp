import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { CurrencyInput } from '@/components/ref/CurrencyInput';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR, rupeesToPaise } from '@/lib/refMoney';
import { areaText, type RefProduct, type RefSeller } from './refTypes';

interface Manufacturer {
  id: string;
  name: string;
}
interface Listing {
  id: string;
  sku: { productName: string; packLabel: string } | null;
  ratePaisePerUnit: number;
  quantityBoxes: number;
  status: string;
}

/** Quick-add defaults, as the reference; the full New listing form still has every field. */
const QUICK_ADD_DEFAULTS = {
  expiryBand: 'M12_PLUS',
  moqBoxes: 1,
  provenance: 'OWN_STOCK',
} as const;

/**
 * Purchase → a seller, as the reference (app/(purchase)/sellers/[id]): his details and tier, his companies
 * (dealerships), "His products" to list a pack in one line, and his listings. The reference's auto-confirm switch
 * comes with Fast order (build R7) and the portal login panel with the portals (build R9).
 */
export function SellerDetailPage() {
  const { id = '' } = useParams();
  const [seller, setSeller] = useState<RefSeller | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<RefProduct[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [dealershipError, setDealershipError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<
    Record<string, { rate: number | undefined; qty: number | undefined }>
  >({});
  const [skuErrors, setSkuErrors] = useState<Record<string, string>>({});
  const [skuConfirming, setSkuConfirming] = useState<Record<string, boolean>>({});
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);
  useDocumentTitle(seller?.firmName ?? 'Seller');

  async function loadListings() {
    const data = await refGet<{ listings: Listing[] }>('/listings', {
      sellerId: id,
      pageSize: 100,
    });
    setListings(data.listings ?? []);
  }

  useOnMount(async () => {
    const res = await refGet<{ seller: RefSeller }>(`/sellers/${id}`).catch(() => null);
    if (!res) {
      setNotFound(true);
      return;
    }
    const [manufacturers, productsData] = await Promise.all([
      refGet<{ manufacturers: (Manufacturer & { active: boolean })[] }>('/manufacturers'),
      refGet<{ products: RefProduct[] }>('/products', { pageSize: 100 }),
    ]);
    setSeller(res.seller);
    setAllManufacturers((manufacturers.manufacturers ?? []).filter((m) => m.active));
    setProducts(productsData.products ?? []);
    await loadListings();
  });

  if (notFound) return <div className="p-8 text-sm text-zinc-500">Seller not found.</div>;
  if (!seller) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;

  const dealerIds = new Set(seller.manufacturerIds);
  const groups = allManufacturers
    .filter((m) => dealerIds.has(m.id))
    .map((m) => ({ manufacturer: m, products: products.filter((p) => p.manufacturerId === m.id) }));

  async function addDealership(manufacturerId: string) {
    if (!seller) return;
    setDealershipError(null);
    setAdding(manufacturerId);
    const res = await refSend<{ seller: RefSeller }>('PATCH', `/sellers/${id}`, {
      manufacturerIds: [...seller.manufacturerIds, manufacturerId],
    });
    setAdding(null);
    if (!res.ok) {
      setDealershipError(res.message);
      return;
    }
    setSeller(res.data.seller);
  }

  async function changeTier(tier: RefSeller['tier']) {
    setTierError(null);
    setTierSaving(true);
    const res = await refSend<{ seller: RefSeller }>('PATCH', `/sellers/${id}`, { tier });
    setTierSaving(false);
    if (!res.ok) {
      setTierError(res.message);
      return;
    }
    setSeller(res.data.seller);
  }

  const draftFor = (skuId: string) => drafts[skuId] ?? { rate: undefined, qty: undefined };

  async function addToList(skuId: string, confirmed: boolean) {
    const draft = draftFor(skuId);
    setSkuErrors((e) => ({ ...e, [skuId]: '' }));
    if (draft.rate === undefined || draft.qty === undefined) {
      setSkuErrors((e) => ({ ...e, [skuId]: 'Enter a rate and quantity first.' }));
      return;
    }
    const res = await refSend('POST', '/listings', {
      sellerId: id,
      skuId,
      rateType: 'FOR',
      ratePaisePerUnit: rupeesToPaise(draft.rate),
      quantityBoxes: draft.qty,
      ...QUICK_ADD_DEFAULTS,
      ...(confirmed ? { confirmDecrease: true } : {}),
    });
    if (!res.ok) {
      setSkuErrors((e) => ({ ...e, [skuId]: res.message }));
      setSkuConfirming((c) => ({ ...c, [skuId]: res.code === 'RATE_DECREASE_NEEDS_CONFIRMATION' }));
      return;
    }
    setDrafts((d) => ({ ...d, [skuId]: { rate: undefined, qty: undefined } }));
    setSkuConfirming((c) => ({ ...c, [skuId]: false }));
    await loadListings();
  }

  function toggle(manufacturerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(manufacturerId)) next.delete(manufacturerId);
      else next.add(manufacturerId);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          {seller.firmName}
        </h1>
        <Link
          to={`/seller-funnels?q=${encodeURIComponent(seller.number)}`}
          className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        >
          Open funnel
        </Link>
      </div>

      <dl className="mb-6 grid grid-cols-[160px_1fr] gap-y-2 rounded border border-zinc-200 p-4 text-sm">
        <dt className="text-zinc-500">GSTIN</dt>
        <dd>{seller.gstin}</dd>
        <dt className="text-zinc-500">Mobile</dt>
        <dd>{seller.mobile}</dd>
        <dt className="text-zinc-500">Bank account</dt>
        <dd>••••{seller.bank.accountLast4}</dd>
        <dt className="text-zinc-500">IFSC</dt>
        <dd>{seller.bank.ifsc}</dd>
        <dt className="text-zinc-500">Area</dt>
        <dd>{areaText(seller.tehsil)}</dd>
        <dt className="text-zinc-500">Dispatch cut-off</dt>
        <dd>{seller.dispatchCutoff}</dd>
        <dt className="text-zinc-500">Registered</dt>
        <dd>{formatDateIST(seller.createdAt)}</dd>
        <dt className="text-zinc-500">Tier</dt>
        <dd>
          <select
            aria-label="Tier"
            value={seller.tier}
            disabled={tierSaving}
            onChange={(e) => void changeTier(e.target.value as RefSeller['tier'])}
            className="min-h-11 rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="NEW">New</option>
            <option value="VERIFIED">Verified</option>
            <option value="TRUSTED">Trusted</option>
          </select>
          {tierError && <span className="ml-2 text-xs text-red-600">{tierError}</span>}
        </dd>
      </dl>

      <div className="mb-6 rounded border border-zinc-200 p-4">
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

      <div className="mb-6 rounded border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">His products</h2>
        {groups.length === 0 && (
          <p className="text-sm text-zinc-400">
            Assign a company above to see its product range here.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const isOpen = expanded.has(group.manufacturer.id);
            const skuCount = group.products.reduce((n, p) => n + p.skus.length, 0);
            return (
              <div key={group.manufacturer.id} className="rounded border border-zinc-100">
                <button
                  type="button"
                  onClick={() => toggle(group.manufacturer.id)}
                  className="flex w-full items-center justify-between px-3 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                    <span
                      className={`inline-block text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    >
                      ▶
                    </span>
                    {group.manufacturer.name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {skuCount} product{skuCount === 1 ? '' : 's'}
                  </span>
                </button>
                {isOpen && (
                  <div className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100 px-3">
                    {group.products.flatMap((product) =>
                      product.skus.map((sku) => {
                        const draft = draftFor(sku.id);
                        const label = `${product.name} — ${sku.packLabel}`;
                        return (
                          <div
                            key={sku.id}
                            className="flex flex-wrap items-center gap-2 py-3"
                            data-testid="his-product"
                          >
                            <span className="min-w-[160px] flex-1 text-sm text-zinc-700">
                              {label}
                              <span className="ml-1 text-xs text-zinc-400">
                                Class {sku.skuClass}
                              </span>
                            </span>
                            <CurrencyInput
                              ariaLabel={`Rate for ${label}`}
                              value={draft.rate}
                              onChange={(v) =>
                                setDrafts((d) => ({ ...d, [sku.id]: { ...draft, rate: v } }))
                              }
                            />
                            <QuantityStepper
                              ariaLabel={`Boxes for ${label}`}
                              value={draft.qty}
                              onChange={(v) =>
                                setDrafts((d) => ({ ...d, [sku.id]: { ...draft, qty: v } }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => void addToList(sku.id, false)}
                              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                            >
                              Add to list
                            </button>
                            {skuErrors[sku.id] && (
                              <div className="w-full text-xs text-amber-700">
                                {skuErrors[sku.id]}
                                {skuConfirming[sku.id] && (
                                  <button
                                    type="button"
                                    onClick={() => void addToList(sku.id, true)}
                                    className="ml-2 rounded bg-amber-800 px-2 py-1 text-xs font-medium text-white hover:bg-amber-900"
                                  >
                                    Confirm anyway
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }),
                    )}
                    {skuCount === 0 && (
                      <p className="py-3 text-sm text-zinc-400">
                        No SKUs set up for this company yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Listings</h2>
        <div className="flex flex-col divide-y divide-zinc-100">
          {listings.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
              data-testid="listing-row"
            >
              <span>
                {l.sku?.productName} — {l.sku?.packLabel}
              </span>
              <span className="text-zinc-500">{l.quantityBoxes} boxes</span>
              <strong>{formatPaiseAsINR(l.ratePaisePerUnit)} per unit</strong>
              <span className="text-xs text-zinc-400">{l.status}</span>
            </div>
          ))}
          {listings.length === 0 && <p className="py-2 text-sm text-zinc-400">No listings yet.</p>}
        </div>
      </div>
    </div>
  );
}
