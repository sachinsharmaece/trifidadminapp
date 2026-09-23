import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiUpload, FiX } from 'react-icons/fi';
import {
  getAllManufacturers,
  getProductById,
  getSkusForProduct,
  importSkus,
  updateProduct,
  updateSku,
} from '../../api/catalog';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { ProductDto, SkuDto, SkuImportRowResult } from '../../api/dto';

/** Manage → Products → Product details. View, with an edit option, plus its SKUs. */
export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const [editing, setEditing] = useState(false);

  const loader = useCallback(
    () => callApi((token) => getProductById(token, productId!)),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/manage/products')}>
        Products
      </Button>

      <DevNote screen="admin_product_detail" />

      <AsyncBoundary state={state} onRetry={retry}>
        {(product: ProductDto) =>
          editing ? (
            <EditProductForm
              product={product}
              onSaved={() => {
                setEditing(false);
                retry();
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <ProductDetailCard product={product} onEdit={() => setEditing(true)} />
          )
        }
      </AsyncBoundary>

      {productId && !editing && <SkusSection productId={productId} />}
    </div>
  );
}

function ProductDetailCard({ product, onEdit }: { product: ProductDto; onEdit: () => void }) {
  return (
    <Card
      title={product.brand}
      actions={
        <Button variant="secondary" icon={<FiEdit2 />} onClick={onEdit}>
          Edit
        </Button>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Technical</dt>
          <dd className="font-medium text-slate-900">{product.technical}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Manufacturer</dt>
          <dd className="font-medium text-slate-900">{product.manufacturerName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">HSN</dt>
          <dd className="font-medium text-slate-900">{product.hsn}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Class</dt>
          <dd className="font-medium text-slate-900">{product.class}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd>
            <Badge tone={product.active ? 'good' : 'neutral'}>
              {product.active ? 'Active' : 'Inactive'}
            </Badge>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function EditProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product: ProductDto;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { callApi } = useAuth();
  const manufacturersLoader = useCallback(
    () => callApi((token) => getAllManufacturers(token)),
    [callApi],
  );
  const manufacturers = useAsyncData(manufacturersLoader, (items) => items.length === 0, [
    manufacturersLoader,
  ]);

  const [brand, setBrand] = useState(product.brand);
  const [technical, setTechnical] = useState(product.technical ?? '');
  const [manufacturerId, setManufacturerId] = useState(product.manufacturerId ?? '');
  const [hsn, setHsn] = useState(product.hsn);
  const [productClass, setProductClass] = useState<'A' | 'B' | 'C'>(product.class);
  const [active, setActive] = useState(product.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        updateProduct(token, product.productId, {
          brand,
          technical,
          manufacturerId,
          hsn,
          class: productClass,
          active,
        }),
      );
      onSaved();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not save these changes.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Edit product">
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="ep-brand"
          label="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          required
        />
        <Input
          id="ep-technical"
          label="Technical"
          value={technical}
          onChange={(e) => setTechnical(e.target.value)}
          required
        />
        <Select
          id="ep-manufacturer"
          label="Manufacturer"
          value={manufacturerId}
          onChange={(e) => setManufacturerId(e.target.value)}
          required
        >
          <option value="">Select…</option>
          {manufacturers.state.status === 'success' &&
            manufacturers.state.data.map((manufacturer) => (
              <option key={manufacturer.manufacturerId} value={manufacturer.manufacturerId}>
                {manufacturer.name}
              </option>
            ))}
        </Select>
        <Input
          id="ep-hsn"
          label="HSN"
          value={hsn}
          onChange={(e) => setHsn(e.target.value)}
          required
        />
        <Select
          id="ep-class"
          label="Class"
          value={productClass}
          onChange={(e) => setProductClass(e.target.value as 'A' | 'B' | 'C')}
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
          <Button type="button" variant="secondary" icon={<FiX />} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

const BASE_UNITS = ['LTR', 'KG', 'PC'] as const;

function SkusSection({ productId }: { productId: string }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSkusForProduct(token, productId)),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);

  const [packLabel, setPackLabel] = useState('');
  const [packSize, setPackSize] = useState('');
  const [baseUnit, setBaseUnit] = useState<(typeof BASE_UNITS)[number]>('LTR');
  const [unitsPerBox, setUnitsPerBox] = useState('');
  const [result, setResult] = useState<SkuImportRowResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const baseUnitsPerBoxPreview =
    packSize && unitsPerBox
      ? baseUnit === 'PC'
        ? Number(unitsPerBox)
        : Number(packSize) * Number(unitsPerBox)
      : null;

  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    setImportError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const [row] = await callApi((token) =>
        importSkus(token, productId, [
          { packLabel, packSize: Number(packSize), baseUnit, unitsPerBox: Number(unitsPerBox) },
        ]),
      );
      setResult(row ?? null);
      if (row?.accepted) {
        setPackLabel('');
        setPackSize('');
        setUnitsPerBox('');
        retry();
      }
    } catch (error) {
      setImportError(error instanceof ApiError ? error.message : 'Could not add this SKU.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="SKUs">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No SKUs yet.">
        {(items: SkuDto[]) => (
          <Table className="mb-4">
            <thead>
              <tr>
                <Th>Pack</Th>
                <Th>Pack size</Th>
                <Th>Base unit</Th>
                <Th>Units/box</Th>
                <Th>Base units/box</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((sku) =>
                editingSkuId === sku.skuId ? (
                  <SkuEditRow
                    key={sku.skuId}
                    sku={sku}
                    onSaved={() => {
                      setEditingSkuId(null);
                      retry();
                    }}
                    onCancel={() => setEditingSkuId(null)}
                  />
                ) : (
                  <tr key={sku.skuId}>
                    <Td>{sku.packLabel}</Td>
                    <Td>{sku.packSize}</Td>
                    <Td>{sku.baseUnit}</Td>
                    <Td>{sku.unitsPerBox}</Td>
                    <Td>{sku.baseUnitsPerBox}</Td>
                    <Td>
                      <Badge tone={sku.active === false ? 'neutral' : 'good'}>
                        {sku.active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiEdit2 />}
                        onClick={() => setEditingSkuId(sku.skuId)}
                      >
                        Edit
                      </Button>
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>

      <form onSubmit={handleAdd} className="grid max-w-2xl grid-cols-2 gap-4">
        <Input
          id="sku-pack-label"
          label="Pack label"
          hint="e.g. 1L, 500ML, 10PC"
          value={packLabel}
          onChange={(e) => setPackLabel(e.target.value)}
          required
        />
        <Select
          id="sku-base-unit"
          label="Base unit"
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value as (typeof BASE_UNITS)[number])}
        >
          {BASE_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </Select>
        <Input
          id="sku-pack-size"
          label="Pack size"
          type="number"
          min={0}
          step="any"
          hint={
            baseUnit === 'PC' ? 'Descriptive only for PC — not used in the calculation' : undefined
          }
          value={packSize}
          onChange={(e) => setPackSize(e.target.value)}
          required
        />
        <Input
          id="sku-units-per-box"
          label="Units per box"
          type="number"
          min={1}
          value={unitsPerBox}
          onChange={(e) => setUnitsPerBox(e.target.value)}
          required
        />
        {baseUnitsPerBoxPreview !== null && (
          <p className="col-span-2 text-sm text-slate-500">
            Base units/box (BR-055): <strong>{baseUnitsPerBoxPreview}</strong>
          </p>
        )}
        {importError && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {importError}
          </p>
        )}
        {result && !result.accepted && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {result.reason}
          </p>
        )}
        {result?.accepted && (
          <p className="col-span-2 text-sm text-success-600">Added as {result.skuId}.</p>
        )}
        <div className="col-span-2">
          <Button type="submit" loading={submitting} icon={<FiUpload />}>
            Add SKU
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SkuEditRow({
  sku,
  onSaved,
  onCancel,
}: {
  sku: SkuDto;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { callApi } = useAuth();
  const [packLabel, setPackLabel] = useState(sku.packLabel);
  const [packSize, setPackSize] = useState(String(sku.packSize));
  const [unitsPerBox, setUnitsPerBox] = useState(String(sku.unitsPerBox));
  const [active, setActive] = useState(sku.active !== false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const baseUnitsPerBoxPreview =
    sku.baseUnit === 'PC' ? Number(unitsPerBox) : Number(packSize) * Number(unitsPerBox);

  async function handleSave(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        updateSku(token, sku.skuId, {
          packLabel,
          packSize: Number(packSize),
          unitsPerBox: Number(unitsPerBox),
          active,
        }),
      );
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not save this SKU.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr>
      <Td>
        <Input
          label="Pack label"
          className="w-28"
          value={packLabel}
          onChange={(e) => setPackLabel(e.target.value)}
        />
      </Td>
      <Td>
        <Input
          label="Pack size"
          className="w-20"
          type="number"
          min={0}
          step="any"
          disabled={sku.baseUnit === 'PC'}
          value={packSize}
          onChange={(e) => setPackSize(e.target.value)}
        />
      </Td>
      <Td>
        {sku.baseUnit}
        <span className="ml-1 text-xs text-slate-400">(fixed)</span>
      </Td>
      <Td>
        <Input
          label="Units per box"
          className="w-20"
          type="number"
          min={1}
          value={unitsPerBox}
          onChange={(e) => setUnitsPerBox(e.target.value)}
        />
      </Td>
      <Td>{Number.isFinite(baseUnitsPerBoxPreview) ? baseUnitsPerBoxPreview : '—'}</Td>
      <Td>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
      </Td>
      <Td>
        <div className="flex gap-2">
          <Button size="sm" loading={submitting} onClick={() => void handleSave()}>
            Save
          </Button>
          <Button size="sm" variant="secondary" icon={<FiX />} onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger-500">
            {error}
          </p>
        )}
      </Td>
    </tr>
  );
}
