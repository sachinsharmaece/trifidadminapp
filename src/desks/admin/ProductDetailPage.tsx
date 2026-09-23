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
} from '../../api/catalog';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select, Textarea } from '../../components/ui/Input';
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

function SkusSection({ productId }: { productId: string }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSkusForProduct(token, productId)),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const [csv, setCsv] = useState('packLabel,packSize,baseUnit,unitsPerBox\n1L,1,LTR,12');
  const [results, setResults] = useState<SkuImportRowResult[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleImport(event: FormEvent): Promise<void> {
    event.preventDefault();
    setImportError(null);
    setSubmitting(true);
    try {
      const lines = csv.trim().split('\n').slice(1);
      const rows = lines.map((line) => {
        const [packLabel, packSize, baseUnit, unitsPerBox] = line
          .split(',')
          .map((cell) => cell.trim());
        return {
          packLabel: packLabel ?? '',
          packSize: Number(packSize),
          baseUnit,
          unitsPerBox: Number(unitsPerBox),
        };
      });
      const result = await callApi((token) => importSkus(token, productId, rows));
      setResults(result);
      retry();
    } catch (error) {
      setImportError(error instanceof ApiError ? error.message : 'Import failed.');
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
                <Th>Base unit</Th>
                <Th>Units/box</Th>
                <Th>Base units/box</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((sku) => (
                <tr key={sku.skuId}>
                  <Td>{sku.packLabel}</Td>
                  <Td>{sku.baseUnit}</Td>
                  <Td>{sku.unitsPerBox}</Td>
                  <Td>{sku.baseUnitsPerBox}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>

      <form onSubmit={handleImport} className="flex max-w-lg flex-col gap-3">
        <Textarea
          id="sku-csv"
          label="Import rows"
          hint="BR-055 — a row failing the baseUnitsPerBox rule is rejected, not imported"
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <Button type="submit" loading={submitting} icon={<FiUpload />} className="self-start">
          Import
        </Button>
      </form>
      {importError && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {importError}
        </p>
      )}
      {results && (
        <Table className="mt-4">
          <thead>
            <tr>
              <Th>Row</Th>
              <Th>Result</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.index}>
                <Td>{row.index + 1}</Td>
                <Td>
                  <Badge tone={row.accepted ? 'good' : 'bad'}>
                    {row.accepted ? 'Accepted' : 'Rejected'}
                  </Badge>
                </Td>
                <Td>{row.accepted ? row.skuId : row.reason}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
