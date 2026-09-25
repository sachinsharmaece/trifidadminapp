import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import { getSellerFile, type SellerFileDto } from '../../api/purchase';
import { proxyCreateListing } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

interface ListablePack {
  productId: string;
  skuId: string;
  label: string;
  eligible: boolean;
  why: string;
}

function listablePacks(file: SellerFileDto): ListablePack[] {
  return file.catalogue.flatMap((c) =>
    c.packs.map((p) => {
      const eligible = c.productState !== 'draft' && p.skuState !== 'draft';
      return {
        productId: c.productId,
        skuId: p.skuId,
        label: `${c.brand} ${p.packLabel}`,
        eligible,
        why: c.productState === 'draft' ? 'the product is a draft' : 'this pack is a draft',
      };
    }),
  );
}

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
        {(file: SellerFileDto) => <ListingForm file={file} />}
      </AsyncBoundary>
    </div>
  );
}

function ListingForm({ file }: { file: SellerFileDto }) {
  const { callApi } = useAuth();
  const packs = useMemo(() => listablePacks(file), [file]);
  const blocked = packs.filter((p) => !p.eligible);
  const eligible = packs.filter((p) => p.eligible);

  const [skuId, setSkuId] = useState('');
  const [ratePaise, setRatePaise] = useState(0);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [moqExact, setMoqExact] = useState(1);
  const [deliveryBand, setDeliveryBand] = useState<'48h' | '2-5d'>('48h');
  const [provenance, setProvenance] = useState<'company' | 'auth'>('company');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState(1);
  const [scopeType, setScopeType] = useState<'my_area' | 'all_india' | 'all_except_mine'>(
    'my_area',
  );
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ listingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const pack = eligible.find((p) => p.skuId === skuId);
    if (!pack) return;
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyCreateListing(token, {
            sellerCounterpartyId: file.counterpartyId,
            productId: pack.productId,
            scopeType,
            lines: [
              {
                skuId,
                ratePaise,
                expiryBand,
                moqExact,
                deliveryBand,
                provenance,
                batch: provenance === 'auth' ? batch : undefined,
                qty,
              },
            ],
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  if (packs.length === 0) {
    return (
      <Card title={`Enter a listing for ${file.firm}`}>
        <p className="text-sm text-danger-500">
          His catalogue is empty — add what he carries first, from his seller file.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Enter a listing for ${file.firm}`}>
      <p className="mb-4 text-sm text-slate-500">
        Same fields, same validation as the seller&apos;s own listing screen. Only products already
        in his catalogue can be listed.
      </p>
      {blocked.length > 0 && (
        <p className="mb-4 rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700">
          {blocked.length} of his pack{blocked.length === 1 ? ' is' : 's are'} not selectable:{' '}
          {blocked.map((b) => `${b.label} (${b.why})`).join(', ')}.
        </p>
      )}
      <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
        <Select
          id="el-sku"
          label="Pack"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        >
          <option value="">Select…</option>
          {eligible.map((p) => (
            <option key={p.skuId} value={p.skuId}>
              {p.label}
            </option>
          ))}
        </Select>
        <Input
          id="el-rate"
          label="Rate, FOR Indore (paise)"
          type="number"
          min={1}
          value={ratePaise}
          onChange={(e) => setRatePaise(Number(e.target.value))}
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
          onChange={(e) => setMoqExact(Number(e.target.value))}
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
          onChange={(e) => setQty(Number(e.target.value))}
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
        <div className="col-span-2">
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
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="col-span-2 text-sm text-success-600">
            Listing {result.listingId} put on the board and logged against you.
          </p>
        )}
        <div className="col-span-2">
          <Button type="submit" loading={submitting} disabled={!skuId} icon={<FiPhoneCall />}>
            Put it on the board
          </Button>
        </div>
      </form>
    </Card>
  );
}
