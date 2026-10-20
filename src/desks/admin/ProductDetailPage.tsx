import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiUpload, FiX } from 'react-icons/fi';
import {
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
import type { ProductCategory, ProductDto, SkuDto, SkuImportRowResult } from '../../api/dto';
import {
  AddHsnModal,
  AddManufacturerModal,
  AddTechnicalModal,
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  MasterPicker,
  useProductMasters,
} from './productMasters';

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
            <ProductDetailCard
              product={product}
              onEdit={() => setEditing(true)}
              onConfirmDraft={() =>
                void callApi((token) =>
                  updateProduct(token, product.productId, { state: 'live' }),
                ).then(retry)
              }
            />
          )
        }
      </AsyncBoundary>

      {productId && !editing && <SkusSection productId={productId} />}
    </div>
  );
}

function ProductDetailCard({
  product,
  onEdit,
  onConfirmDraft,
}: {
  product: ProductDto;
  onEdit: () => void;
  onConfirmDraft: () => void;
}) {
  return (
    <Card
      title={product.brand}
      actions={
        <div className="flex gap-2">
          {product.state === 'draft' && (
            <Button variant="secondary" onClick={onConfirmDraft}>
              Confirm draft
            </Button>
          )}
          <Button variant="secondary" icon={<FiEdit2 />} onClick={onEdit}>
            Edit
          </Button>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Category</dt>
          <dd className="font-medium text-slate-900">
            {product.category ? CATEGORY_LABEL[product.category] : '—'}
          </dd>
        </div>
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
          <dt className="text-slate-500">Tax %</dt>
          <dd className="font-medium text-slate-900">
            {product.taxPercent !== undefined ? `${product.taxPercent}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Class</dt>
          <dd className="font-medium text-slate-900">{product.class}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="flex gap-1">
            <Badge tone={product.active ? 'good' : 'neutral'}>
              {product.active ? 'Active' : 'Inactive'}
            </Badge>
            {product.state === 'draft' && <Badge tone="warn">draft</Badge>}
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
  const masters = useProductMasters();

  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState<ProductCategory>(product.category ?? 'pesticide');
  const [technical, setTechnical] = useState(product.technical ?? '');
  const [manufacturerId, setManufacturerId] = useState(product.manufacturerId ?? '');
  const [manufacturerName, setManufacturerName] = useState(product.manufacturerName ?? '');
  const [hsn, setHsn] = useState(product.hsn);
  const [taxPercent, setTaxPercent] = useState(String(product.taxPercent ?? 18));
  const [adding, setAdding] = useState<{
    kind: 'technical' | 'manufacturer' | 'hsn';
    typed: string;
  } | null>(null);

  const technicalOptions = useMemo(
    () => masters.technicals.map((t) => ({ value: t.name, label: t.name })),
    [masters.technicals],
  );
  const manufacturerOptions = useMemo(
    () => masters.manufacturers.map((m) => ({ value: m.manufacturerId, label: m.name })),
    [masters.manufacturers],
  );
  const hsnOptions = useMemo(
    () =>
      masters.hsns.map((h) => ({
        value: h.code,
        label: h.code,
        detail: [h.description, `${h.taxPercent}%`].filter(Boolean).join(' · '),
      })),
    [masters.hsns],
  );
  const [productClass, setProductClass] = useState<'High' | 'Medium' | 'Low'>(product.class);
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
          category,
          technical,
          manufacturerId,
          hsn,
          taxPercent: Number(taxPercent),
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
          label="Product"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          required
        />
        <Select
          id="ep-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <MasterPicker
          label="Technical"
          required
          options={technicalOptions}
          value={technical}
          selectedLabel={technical}
          addLabel="Add new technical"
          onPick={(value) => setTechnical(value)}
          onAddNew={(typed) => setAdding({ kind: 'technical', typed })}
        />
        <MasterPicker
          label="Manufacturer"
          required
          options={manufacturerOptions}
          value={manufacturerId}
          selectedLabel={manufacturerName}
          addLabel="Add new manufacturer"
          onPick={(value, option) => {
            setManufacturerId(value);
            setManufacturerName(option.label);
          }}
          onAddNew={(typed) => setAdding({ kind: 'manufacturer', typed })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <MasterPicker
            label="HSN"
            required
            options={hsnOptions}
            value={hsn}
            selectedLabel={hsn}
            addLabel="Add new HSN"
            onPick={(value) => {
              setHsn(value);
              // The HSN master carries the default rate; it stays editable here.
              const rate = masters.hsns.find((h) => h.code === value)?.taxPercent;
              if (rate !== undefined) setTaxPercent(String(rate));
            }}
            onAddNew={(typed) => setAdding({ kind: 'hsn', typed })}
          />
          <Input
            id="ep-tax"
            label="Tax %"
            type="number"
            min={0}
            max={100}
            step="any"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            required
          />
        </div>
        <Select
          id="ep-class"
          label="Class"
          value={productClass}
          onChange={(e) => setProductClass(e.target.value as 'High' | 'Medium' | 'Low')}
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
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

      {adding?.kind === 'technical' && (
        <AddTechnicalModal
          open
          initial={adding.typed}
          onClose={() => setAdding(null)}
          onSaved={(name) => {
            masters.reloadTechnicals();
            setTechnical(name);
            setAdding(null);
          }}
        />
      )}
      {adding?.kind === 'manufacturer' && (
        <AddManufacturerModal
          open
          initial={adding.typed}
          onClose={() => setAdding(null)}
          onSaved={(id, name) => {
            masters.reloadManufacturers();
            setManufacturerId(id);
            setManufacturerName(name);
            setAdding(null);
          }}
        />
      )}
      {adding?.kind === 'hsn' && (
        <AddHsnModal
          open
          initial={adding.typed}
          onClose={() => setAdding(null)}
          onSaved={(saved) => {
            masters.reloadHsns();
            setHsn(saved.code);
            setTaxPercent(String(saved.taxPercent));
            setAdding(null);
          }}
        />
      )}
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
                      {sku.state === 'draft' && (
                        <span className="ml-1">
                          <Badge tone="warn">draft</Badge>
                        </span>
                      )}
                    </Td>
                    <Td className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiEdit2 />}
                        onClick={() => setEditingSkuId(sku.skuId)}
                      >
                        Edit
                      </Button>
                      {sku.state === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void callApi((token) =>
                              updateSku(token, sku.skuId, { state: 'live' }),
                            ).then(retry)
                          }
                        >
                          Confirm
                        </Button>
                      )}
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
