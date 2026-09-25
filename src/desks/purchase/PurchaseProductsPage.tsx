import { useCallback, useMemo, useState } from 'react';
import {
  getProductFunnelAll,
  getMastersProducts,
  getMastersManufacturers,
  getDraftMasters,
  postDraftManufacturer,
  postDraftProduct,
  postDraftSku,
  type ProductFunnelRow,
  type DraftMasterItem,
} from '../../api/purchase';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { DevNote } from '../../components/dev/DevNote';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const near = (a: string, b: string) => {
  const na = norm(a);
  const nb = norm(b);
  return na.length > 1 && nb.length > 1 && (na.includes(nb) || nb.includes(na));
};

export function PurchaseProductsPage() {
  const [tab, setTab] = useState<'analysis' | 'master'>('analysis');
  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_products" />
      <div className="flex gap-2">
        <Button
          variant={tab === 'analysis' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('analysis')}
        >
          Analysis
        </Button>
        <Button
          variant={tab === 'master' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('master')}
        >
          Master
        </Button>
      </div>
      {tab === 'analysis' ? <AnalysisTab /> : <MasterTab />}
    </div>
  );
}

function AnalysisTab() {
  const { callApi } = useAuth();
  const funnelLoader = useCallback(() => callApi((token) => getProductFunnelAll(token)), [callApi]);
  const funnel = useAsyncData(funnelLoader, (items) => items.length === 0, [funnelLoader]);
  const productsLoader = useCallback(
    () => callApi((token) => getMastersProducts(token)),
    [callApi],
  );
  const products = useAsyncData(productsLoader, () => false, [productsLoader]);

  const productById = useMemo(() => {
    const map = new Map<string, { brand: string; technical: string; manufacturerName: string }>();
    if (products.state.status === 'success') {
      for (const p of products.state.data) {
        map.set(p.productId, {
          brand: p.brand,
          technical: p.technical,
          manufacturerName: p.manufacturerName,
        });
      }
    }
    return map;
  }, [products.state]);

  const totals = useMemo(() => {
    if (funnel.state.status !== 'success') return null;
    return funnel.state.data.reduce(
      (acc, r) => ({
        inq: acc.inq + r.inq,
        quoted: acc.quoted + r.quoted,
        ordered: acc.ordered + r.ordered,
        openBoxes: acc.openBoxes + r.openBoxes,
      }),
      { inq: 0, quoted: 0, ordered: 0, openBoxes: 0 },
    );
  }, [funnel.state]);

  return (
    <Card title="What came in, what we answered, what converted">
      <p className="mb-4 text-sm text-slate-500">
        Last 30 days for inquiries/quoted/ordered; open interest and seller count are a live
        snapshot. Boxes only — a rupee figure on a Purchase screen is a number somebody eventually
        compares with a seller rate.
      </p>
      <AsyncBoundary state={funnel.state} onRetry={funnel.retry} emptyMessage="No data yet.">
        {(rows: ProductFunnelRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Inquiries</Th>
                <Th>Quoted</Th>
                <Th>Ordered</Th>
                <Th>Fill</Th>
                <Th>Open, boxes</Th>
                <Th>Sellers</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = productById.get(r.productId);
                return (
                  <tr key={r.productId}>
                    <Td className="font-medium">
                      {p?.brand ?? r.productId.slice(-6)}
                      {p && (
                        <div className="text-xs text-slate-500">
                          {p.technical} · {p.manufacturerName}
                        </div>
                      )}
                    </Td>
                    <Td>{r.inq}</Td>
                    <Td>
                      {r.quoted}
                      <div className="text-xs text-slate-500">{r.inq - r.quoted} never quoted</div>
                    </Td>
                    <Td className="font-semibold">{r.ordered}</Td>
                    <Td>{r.fillPct === null ? '—' : `${r.fillPct}%`}</Td>
                    <Td>{r.openBoxes}</Td>
                    <Td
                      className={
                        r.sellerCount === 0
                          ? 'text-danger-500'
                          : r.sellerCount === 1
                            ? 'text-warning-600'
                            : ''
                      }
                    >
                      {r.sellerCount}
                    </Td>
                  </tr>
                );
              })}
              {totals && (
                <tr className="border-t-2 border-slate-900 font-semibold">
                  <Td>Total</Td>
                  <Td>{totals.inq}</Td>
                  <Td>{totals.quoted}</Td>
                  <Td>{totals.ordered}</Td>
                  <Td>
                    {totals.inq ? `${Math.round((totals.ordered / totals.inq) * 1000) / 10}%` : '—'}
                  </Td>
                  <Td>{totals.openBoxes}</Td>
                  <Td />
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
      <p className="mt-4 text-sm text-slate-500">
        Read the last two columns together — a low fill with one seller is a supply problem; a low
        fill with several sellers is a rate problem, or the buyer&apos;s own choice.
      </p>
    </Card>
  );
}

function MasterTab() {
  const { callApi } = useAuth();
  const draftsLoader = useCallback(() => callApi((token) => getDraftMasters(token)), [callApi]);
  const drafts = useAsyncData(draftsLoader, (items) => items.length === 0, [draftsLoader]);
  const manufacturersLoader = useCallback(
    () => callApi((token) => getMastersManufacturers(token)),
    [callApi],
  );
  const manufacturers = useAsyncData(manufacturersLoader, (items) => items.length === 0, [
    manufacturersLoader,
  ]);
  const productsLoader = useCallback(
    () => callApi((token) => getMastersProducts(token)),
    [callApi],
  );
  const products = useAsyncData(productsLoader, (items) => items.length === 0, [productsLoader]);

  const refreshAll = () => {
    drafts.retry();
    manufacturers.retry();
    products.retry();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="Waiting on Admin">
        <p className="mb-4 text-sm text-slate-500">
          A draft works everywhere on this desk at once. It cannot be listed, quoted or ordered
          until Admin confirms it.
        </p>
        <AsyncBoundary state={drafts.state} onRetry={drafts.retry} emptyMessage="Nothing waiting.">
          {(items: DraftMasterItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>What</Th>
                  <Th>Name</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={`${d.kind}-${d.id}`}>
                    <Td>
                      <Badge tone="warn">{d.kind}</Badge>
                    </Td>
                    <Td className="font-medium">{d.name}</Td>
                    <Td className="text-xs text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>

      <AsyncBoundary state={manufacturers.state} onRetry={manufacturers.retry}>
        {(mfrs) => (
          <AsyncBoundary state={products.state} onRetry={products.retry}>
            {(prods) => (
              <NewMastersCard manufacturers={mfrs} products={prods} onCreated={refreshAll} />
            )}
          </AsyncBoundary>
        )}
      </AsyncBoundary>
    </div>
  );
}

function NewMastersCard({
  manufacturers,
  products,
  onCreated,
}: {
  manufacturers: Array<{ manufacturerId: string; name: string }>;
  products: Array<{ productId: string; brand: string }>;
  onCreated: () => void;
}) {
  const { callApi } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [brand, setBrand] = useState('');
  const [technical, setTechnical] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [hsn, setHsn] = useState('3808');
  const [packProductId, setPackProductId] = useState('');
  const [packLabel, setPackLabel] = useState('');
  const [packSize, setPackSize] = useState(1);
  const [baseUnit, setBaseUnit] = useState<'LTR' | 'KG' | 'PC'>('LTR');
  const [unitsPerBox, setUnitsPerBox] = useState(1);
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

  function fail(e: unknown) {
    setError(e instanceof ApiError ? e.message : 'Could not add this.');
  }

  return (
    <Card title="Add to the master">
      <p className="mb-4 text-sm text-slate-500">
        Add anything a seller names on a call. Safe to add — the near-duplicate check below is the
        one control worth reading before you do.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <Input
            id="pm-company"
            label="Add a company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          {companyDupes.length > 0 && (
            <p className="mt-1 text-xs text-warning-600">
              Already have: {companyDupes.map((d) => d.name).join(', ')}
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
                  setMessage('Company added as a draft.');
                  setCompanyName('');
                  onCreated();
                })
                .catch(fail)
            }
          >
            Add company
          </Button>
        </div>

        <div>
          <Input
            id="pm-brand"
            label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          {productDupes.length > 0 && (
            <p className="mt-1 text-xs text-warning-600">
              Already have: {productDupes.map((d) => d.brand).join(', ')}
            </p>
          )}
          <Input
            id="pm-technical"
            label="Technical"
            className="mt-2"
            value={technical}
            onChange={(e) => setTechnical(e.target.value)}
          />
          <Select
            id="pm-manufacturer"
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
            id="pm-hsn"
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
                  setMessage('Product added as a draft.');
                  setBrand('');
                  setTechnical('');
                  onCreated();
                })
                .catch(fail)
            }
          >
            Add product
          </Button>
        </div>

        <div>
          <Select
            id="pm-pack-product"
            label="Its first pack — product"
            value={packProductId}
            onChange={(e) => setPackProductId(e.target.value)}
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.brand}
              </option>
            ))}
          </Select>
          <Input
            id="pm-pack-label"
            label="Pack"
            className="mt-2"
            placeholder="500 GM"
            value={packLabel}
            onChange={(e) => setPackLabel(e.target.value)}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Select
              id="pm-pack-unit"
              label="Base unit"
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value as typeof baseUnit)}
            >
              <option value="LTR">LTR</option>
              <option value="KG">KG</option>
              <option value="PC">PC</option>
            </Select>
            <Input
              id="pm-pack-size"
              label="Pack size"
              type="number"
              value={packSize}
              onChange={(e) => setPackSize(Number(e.target.value))}
            />
            <Input
              id="pm-pack-upb"
              label="Units/box"
              type="number"
              value={unitsPerBox}
              onChange={(e) => setUnitsPerBox(Number(e.target.value))}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={!packProductId || !packLabel}
            onClick={() =>
              void callApi((token) =>
                postDraftSku(token, {
                  productId: packProductId,
                  packLabel,
                  packSize,
                  baseUnit,
                  unitsPerBox,
                }),
              )
                .then(() => {
                  setMessage('Pack added as a draft.');
                  setPackLabel('');
                  onCreated();
                })
                .catch(fail)
            }
          >
            Add pack
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger-500">{error}</p>}
      {message && <p className="mt-3 text-sm text-success-600">{message}</p>}
    </Card>
  );
}
