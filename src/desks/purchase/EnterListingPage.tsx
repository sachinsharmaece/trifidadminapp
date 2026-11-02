import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import { getSellerFile, postSellerCatalogueEntry, type SellerFileDto } from '../../api/purchase';
import { searchProducts } from '../../api/catalog';
import { newIdempotencyKey } from '../../lib/idempotency';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { proxyCreateListing } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';
import { listBlockedReason } from './listBlockedReason';
import { FormActions } from '../../components/ui/FormActions';

/**
 * 25 Oct — pick the product first (searchable: what he carries comes first,
 * then any live product), then its pack. A product he does not carry yet can
 * be added to his catalogue right here; one that cannot be listed says why
 * (switched off, draft, draft company, no active pack) instead of vanishing.
 */
export function EnterListingPage() {
  const { id: sellerId } = useParams<{ id: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(
    () => callApi((token) => getSellerFile(token, sellerId!)),
    [callApi, sellerId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        icon={<FiArrowLeft />}
        onClick={() => navigate(`/purchase/sellers/${sellerId}`)}
      >
        Back to seller
      </Button>
      <DevNote screen="purchase_enter_listing" />
      <AsyncBoundary state={state} onRetry={retry}>
        {(file: SellerFileDto) => <ListingForm file={file} onCatalogueChanged={retry} />}
      </AsyncBoundary>
    </div>
  );
}

const MIN_SEARCH = 2;

function ListingForm({
  file,
  onCatalogueChanged,
}: {
  file: SellerFileDto;
  onCatalogueChanged: () => void;
}) {
  const { callApi } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectProductId = searchParams.get('productId');
  const [productId, setProductId] = useState(preselectProductId ?? '');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<
    Array<{ productId: string; brand: string; technical: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ productId: string; brand: string } | null>(null);

  const carried = useMemo(
    () => new Map(file.catalogue.map((c) => [c.productId, c])),
    [file.catalogue],
  );

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_SEARCH) {
      setFound([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void callApi((token) => searchProducts(token, term))
        .then((rows) => {
          if (!cancelled) setFound(rows);
        })
        .catch(() => {
          if (!cancelled) setFound([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, callApi]);

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    const mine = file.catalogue
      .filter(
        (c) =>
          !term || `${c.brand} ${c.technical} ${c.manufacturerName}`.toLowerCase().includes(term),
      )
      .map((c) => {
        const reason = listBlockedReason(c);
        return {
          value: c.productId,
          label: c.brand,
          detail: [c.manufacturerName, reason ? 'can’t be listed yet' : 'he carries it']
            .filter(Boolean)
            .join(' · '),
        };
      });
    const others = found
      .filter((p) => !carried.has(p.productId))
      .map((p) => ({
        value: p.productId,
        label: p.brand,
        detail: `${p.technical} · not in his catalogue`,
      }));
    return [...mine, ...others].slice(0, 60);
  }, [file.catalogue, found, carried, query]);

  const chosen = productId ? carried.get(productId) : undefined;
  const chosenReason = chosen ? listBlockedReason(chosen) : null;
  const packs = chosen && !chosenReason ? chosen.packs.filter((p) => p.skuState !== 'draft') : [];
  const notCarried = Boolean(productId) && !chosen;
  const chosenName = chosen?.brand ?? (picked?.productId === productId ? picked.brand : '') ?? '';

  const [skuId, setSkuId] = useState(() => (packs[0] && packs.length === 1 ? packs[0].skuId : ''));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function pickProduct(next: string, label: string): void {
    setProductId(next);
    setPicked({ productId: next, brand: label });
    const c = carried.get(next);
    const live = c && !listBlockedReason(c) ? c.packs.filter((p) => p.skuState !== 'draft') : [];
    setSkuId(live.length === 1 ? live[0]!.skuId : '');
    setAddError(null);
  }

  async function addToCatalogue(): Promise<void> {
    setAdding(true);
    setAddError(null);
    try {
      const key = newIdempotencyKey();
      await callApi((token) =>
        postSellerCatalogueEntry(token, { sellerId: file.sellerId, productId }, key),
      );
      // Reloading the file remounts this form; the product stays picked through the URL.
      setSearchParams({ productId }, { replace: true });
      onCatalogueChanged();
    } catch (error) {
      setAddError(error instanceof ApiError ? error.message : 'Could not add it to his catalogue.');
    } finally {
      setAdding(false);
    }
  }
  // Sellers quote a rate in rupees on the phone (BR-055 stores it in paise,
  // but nobody speaks paise) — the field takes rupees and this converts,
  // rather than storing whatever's typed as paise directly.
  const [rateRupeesText, setRateRupeesText] = useState('');
  const parsedRatePaise =
    rateRupeesText.trim() === '' ? null : Math.round(Number(rateRupeesText) * 100);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [moqExact, setMoqExact] = useState('');
  const [deliveryBand, setDeliveryBand] = useState<'48h' | '2-5d'>('48h');
  const [provenance, setProvenance] = useState<'company' | 'auth'>('company');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState('');
  const [scopeType, setScopeType] = useState<'my_area' | 'all_india' | 'all_except_mine'>(
    'my_area',
  );
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ listingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const pack = packs.find((p) => p.skuId === skuId);
    if (!pack) return;
    if (parsedRatePaise === null || Number.isNaN(parsedRatePaise) || parsedRatePaise <= 0) {
      setError('Enter the rate in rupees, e.g. 280.00.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyCreateListing(token, {
            sellerCounterpartyId: file.counterpartyId,
            productId,
            scopeType,
            lines: [
              {
                skuId,
                ratePaise: parsedRatePaise,
                expiryBand,
                moqExact: Number(moqExact),
                deliveryBand,
                provenance,
                batch: provenance === 'auth' ? batch : undefined,
                qty: Number(qty),
              },
            ],
            callNote,
          }),
        ),
      );
      // B-03 — this page stays put on success (unlike the seller's own
      // screen, which navigates away); leaving the form populated invites a
      // second, identical submit. Reset back to the form's own defaults.
      setSkuId(packs.length === 1 ? packs[0]!.skuId : '');
      setRateRupeesText('');
      setExpiryBand('over12');
      setMoqExact('');
      setDeliveryBand('48h');
      setProvenance('company');
      setBatch('');
      setQty('');
      setScopeType('my_area');
      setCallNote('');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title={`Enter a listing for ${file.firm}`}>
      <p className="mb-4 text-sm text-slate-500">
        Same fields, same validation as the seller&apos;s own listing screen. Pick the product —
        what he carries comes first; type to find any other product, and add it to his catalogue if
        he sells it.
      </p>
      <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-full">
          <SearchSelect
            label="Product"
            required
            placeholder="Type a product, technical or company"
            options={options}
            value={productId}
            selectedLabel={chosenName}
            loading={searching}
            onSearch={setQuery}
            onChange={(value, option) => pickProduct(value, option.label)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Made a product in another tab?{' '}
            <button type="button" className="text-brand-600 underline" onClick={onCatalogueChanged}>
              Refresh the list
            </button>
            .
          </p>
        </div>
        {notCarried && (
          <div
            role="status"
            className="col-span-full flex flex-wrap items-center gap-3 rounded-md border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600"
          >
            <span>
              He doesn&apos;t carry {chosenName || 'this product'} yet — add it to his catalogue to
              list it.
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={adding}
              onClick={() => void addToCatalogue()}
            >
              Add to his catalogue
            </Button>
            {addError && <span className="text-danger-500">{addError}</span>}
          </div>
        )}
        {chosen && chosenReason && (
          <p
            role="alert"
            className="col-span-full rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            {chosen.brand} can’t be listed yet — {chosenReason}.
          </p>
        )}
        {file.catalogue.length === 0 && !productId && (
          <p className="col-span-full text-sm text-slate-500">
            His catalogue is empty — find the product above and add it, or tick the companies he
            deals in from his seller file.
          </p>
        )}
        <Select
          id="el-sku"
          label="Pack"
          value={skuId}
          disabled={packs.length === 0}
          onChange={(e) => setSkuId(e.target.value)}
          required
        >
          <option value="">{packs.length === 0 ? 'Pick a product first' : 'Select…'}</option>
          {packs.map((p) => (
            <option key={p.skuId} value={p.skuId}>
              {p.packLabel}
            </option>
          ))}
        </Select>
        <Input
          id="el-rate"
          label="Rate, FOR Indore (₹)"
          type="number"
          min={0.01}
          step={0.01}
          value={rateRupeesText}
          onChange={(e) => setRateRupeesText(e.target.value)}
          hint={
            parsedRatePaise !== null && !Number.isNaN(parsedRatePaise) && parsedRatePaise > 0
              ? `Saves as ₹${(parsedRatePaise / 100).toFixed(2)} — check this matches what he quoted before you submit.`
              : 'Enter the rupee figure he quoted on the phone, e.g. 280.00.'
          }
          required
        />
        <Select
          id="el-expiry"
          label="Expiry"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as typeof expiryBand)}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Input
          id="el-moq"
          label="MOQ (boxes)"
          type="number"
          min={1}
          hint="Any value above 1 opens a pool on this SKU's condition set (BR-150)."
          value={moqExact}
          onChange={(e) => setMoqExact(e.target.value)}
          required
        />
        <Select
          id="el-delivery"
          label="Delivery"
          value={deliveryBand}
          onChange={(e) => setDeliveryBand(e.target.value as typeof deliveryBand)}
        >
          <option value="48h">48 hours</option>
          <option value="2-5d">2–5 days</option>
        </Select>
        <Select
          id="el-provenance"
          label="Provenance"
          value={provenance}
          onChange={(e) => setProvenance(e.target.value as typeof provenance)}
        >
          <option value="company">Company billing</option>
          <option value="auth">My stock (auth)</option>
        </Select>
        {provenance === 'auth' && (
          <Input
            id="el-batch"
            label="Batch (mandatory)"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            required
          />
        )}
        <Input
          id="el-qty"
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
        />
        <Select
          id="el-scope"
          label="Territory"
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as typeof scopeType)}
        >
          <option value="my_area">My area</option>
          <option value="all_india">All India</option>
          <option value="all_except_mine">All India except his area</option>
        </Select>
        <div className="col-span-full">
          <Textarea
            id="el-note"
            label="Authority — who you spoke to, what he said"
            hint="Called 24 Sep 11:20. He gave 1002 FOR Indore, 26–100 boxes, 2–3 days."
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="col-span-full text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="col-span-full text-sm text-success-600">
            Listing put on the board and logged against you.
          </p>
        )}
        <FormActions>
          <Button type="submit" loading={submitting} disabled={!skuId} icon={<FiPhoneCall />}>
            Put it on the board
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
