import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  getMastersProducts,
  postSellerCatalogueEntry,
  postDraftManufacturer,
  postDraftProduct,
  getMastersManufacturers,
} from '../../api/purchase';
import { getSkusForProduct } from '../../api/catalog';
import type { SkuDto } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const near = (a: string, b: string) => {
  const na = norm(a);
  const nb = norm(b);
  return na.length > 1 && nb.length > 1 && (na.includes(nb) || nb.includes(na));
};

export function AddCatalogueEntryPage() {
  const { id: sellerId } = useParams<{ id: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();

  const productsLoader = useCallback(
    () => callApi((token) => getMastersProducts(token)),
    [callApi],
  );
  const products = useAsyncData(productsLoader, (items) => items.length === 0, [productsLoader]);
  const manufacturersLoader = useCallback(
    () => callApi((token) => getMastersManufacturers(token)),
    [callApi],
  );
  const manufacturers = useAsyncData(manufacturersLoader, (items) => items.length === 0, [
    manufacturersLoader,
  ]);

  const [productId, setProductId] = useState('');
  const [selectedSkuIds, setSelectedSkuIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const skusLoader = useCallback(
    () =>
      productId ? callApi((token) => getSkusForProduct(token, productId)) : Promise.resolve([]),
    [callApi, productId],
  );
  const skus = useAsyncData(skusLoader, () => false, [skusLoader]);

  async function handleAdd(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        postSellerCatalogueEntry(token, { sellerId: sellerId!, productId, skuIds: selectedSkuIds }),
      );
      setSaved(true);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not add this to his catalogue.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        icon={<FiArrowLeft />}
        onClick={() => navigate(`/purchase/sellers/${sellerId}`)}
      >
        Back to seller
      </Button>
      <DevNote screen="purchase_catalogue_entry" />
      <Card title="What does he carry?">
        <p className="mb-4 text-sm text-slate-500">
          Capability, not a price — nothing here reaches a buyer. Leave every pack unticked if he
          just names the product; packs are detail you can add on the next call.
        </p>
        <AsyncBoundary state={products.state} onRetry={products.retry}>
          {(items) => (
            <div className="max-w-md">
              <Select
                id="ace-product"
                label="Product"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setSelectedSkuIds([]);
                  setSaved(false);
                }}
              >
                <option value="">Select…</option>
                {items.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.brand} · {p.technical} · {p.manufacturerName}
                    {p.state === 'draft' ? ' (draft)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </AsyncBoundary>

        {productId && (
          <div className="mt-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Packs he can supply (leave unticked for the whole product)
            </span>
            <AsyncBoundary
              state={skus.state}
              onRetry={skus.retry}
              emptyMessage="No packs on this product yet."
            >
              {(items: SkuDto[]) => (
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <label
                      key={s.skuId}
                      className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkuIds.includes(s.skuId)}
                        onChange={(e) =>
                          setSelectedSkuIds((current) =>
                            e.target.checked
                              ? [...current, s.skuId]
                              : current.filter((id) => id !== s.skuId),
                          )
                        }
                      />
                      {s.packLabel}
                      {s.state === 'draft' ? ' (draft)' : ''}
                    </label>
                  ))}
                </div>
              )}
            </AsyncBoundary>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger-500">
            {error}
          </p>
        )}
        {saved && <p className="mt-4 text-sm text-success-600">Added to his catalogue.</p>}
        <div className="mt-4">
          <Button disabled={!productId} loading={submitting} onClick={() => void handleAdd()}>
            Add
          </Button>
        </div>
      </Card>

      <NewMasterCard
        manufacturers={manufacturers.state.status === 'success' ? manufacturers.state.data : []}
        products={products.state.status === 'success' ? products.state.data : []}
        onCreated={() => {
          products.retry();
          manufacturers.retry();
        }}
      />
    </div>
  );
}

function NewMasterCard({
  manufacturers,
  products,
  onCreated,
}: {
  manufacturers: Array<{ manufacturerId: string; name: string }>;
  products: Array<{ productId: string; brand: string; technical: string }>;
  onCreated: () => void;
}) {
  const { callApi } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [brand, setBrand] = useState('');
  const [technical, setTechnical] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [hsn, setHsn] = useState('3808');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const companyDupes = useMemo(
    () => (companyName.length > 1 ? manufacturers.filter((m) => near(m.name, companyName)) : []),
    [companyName, manufacturers],
  );
  const productDupes = useMemo(
    () => (brand.length > 1 ? products.filter((p) => near(p.brand, brand)) : []),
    [brand, products],
  );

  return (
    <Card title="Naming something not in the master?">
      <p className="mb-4 text-sm text-slate-500">
        Add it now rather than after the call — a draft product works in his catalogue immediately,
        and Admin confirms it before anything of his carries a price to a buyer.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Input
            id="new-company"
            label="Add a company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          {companyDupes.length > 0 && (
            <p className="mt-1 text-xs text-warning-600">
              We may already have this: {companyDupes.map((d) => d.name).join(', ')}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={!companyName}
            onClick={() =>
              void callApi((token) => postDraftManufacturer(token, companyName))
                .then(() => {
                  setMessage('Company added as a draft — Admin confirms it.');
                  setCompanyName('');
                  onCreated();
                })
                .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not add.'))
            }
          >
            Add company
          </Button>
        </div>
        <div>
          <Input
            id="new-brand"
            label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          {productDupes.length > 0 && (
            <p className="mt-1 text-xs text-warning-600">
              We may already have this: {productDupes.map((d) => d.brand).join(', ')}
            </p>
          )}
          <Input
            id="new-technical"
            label="Technical"
            className="mt-2"
            value={technical}
            onChange={(e) => setTechnical(e.target.value)}
          />
          <Select
            id="new-manufacturer"
            label="Company"
            className="mt-2"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
          >
            <option value="">Select…</option>
            {manufacturers.map((m) => (
              <option key={m.manufacturerId} value={m.manufacturerId}>
                {m.name}
              </option>
            ))}
          </Select>
          <Input
            id="new-hsn"
            label="HSN"
            className="mt-2"
            value={hsn}
            onChange={(e) => setHsn(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={!brand || !technical || !manufacturerId}
            onClick={() =>
              void callApi((token) =>
                postDraftProduct(token, { brand, technical, manufacturerId, hsn }),
              )
                .then(() => {
                  setMessage('Product added as a draft — Admin confirms it.');
                  setBrand('');
                  setTechnical('');
                  onCreated();
                })
                .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not add.'))
            }
          >
            Add product
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger-500">{error}</p>}
      {message && <p className="mt-3 text-sm text-success-600">{message}</p>}
    </Card>
  );
}
