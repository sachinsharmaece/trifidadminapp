import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiPlus, FiSearch, FiUpload } from 'react-icons/fi';
import {
  createManufacturer,
  createProduct,
  getAllManufacturers,
  getProductsForTechnical,
  getSkusForProduct,
  getTechnicals,
  importSkus,
} from '../../api/catalog';
import { createTehsil, getTehsils } from '../../api/territory';
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
import type { ManufacturerDto, ProductDto, SkuDto, SkuImportRowResult } from '../../api/dto';

export function MastersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Masters</h1>
      <DevNote screen="admin_masters" />
      <TehsilsSection />
      <ManufacturersSection />
      <ProductsSection />
    </div>
  );
}

function TehsilsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getTehsils(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => createTehsil(token, { name, district, state: stateName }));
      setName('');
      setDistrict('');
      setStateName('');
      retry();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not create this tehsil.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Tehsils">
      <p className="mb-4 text-sm text-slate-500">
        BR-080 — name is not a unique key; every picker disambiguates by district.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No tehsils yet.">
        {(items) => (
          <Table className="mb-4">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>District</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((tehsil) => (
                <tr key={tehsil.tehsilId}>
                  <Td>{tehsil.name}</Td>
                  <Td>{tehsil.district}</Td>
                  <Td>{tehsil.state}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="District"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          required
        />
        <Input
          label="State"
          value={stateName}
          onChange={(e) => setStateName(e.target.value)}
          required
        />
        <Button type="submit" loading={submitting} icon={<FiPlus />}>
          Add tehsil
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
    </Card>
  );
}

function ManufacturersSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getAllManufacturers(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => createManufacturer(token, name));
      setName('');
      retry();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not create this manufacturer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Manufacturers">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No manufacturers yet.">
        {(items) => (
          <ul className="mb-4 flex flex-wrap gap-2">
            {items.map((manufacturer) => (
              <li key={manufacturer.manufacturerId}>
                <Badge>{manufacturer.name}</Badge>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" loading={submitting} icon={<FiPlus />}>
          Add manufacturer
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
    </Card>
  );
}

function ProductsSection() {
  const { callApi } = useAuth();

  const technicalsLoader = useCallback(() => callApi((token) => getTechnicals(token)), [callApi]);
  const technicals = useAsyncData(technicalsLoader, (items) => items.length === 0, [
    technicalsLoader,
  ]);

  const manufacturersLoader = useCallback(
    () => callApi((token) => getAllManufacturers(token)),
    [callApi],
  );
  const manufacturers = useAsyncData(manufacturersLoader, (items) => items.length === 0, [
    manufacturersLoader,
  ]);

  const [browseTechnical, setBrowseTechnical] = useState('');
  const [products, setProducts] = useState<ProductDto[] | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  async function handleBrowse(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBrowseError(null);
    try {
      const result = await callApi((token) => getProductsForTechnical(token, browseTechnical));
      setProducts(result);
    } catch (error) {
      setBrowseError(error instanceof ApiError ? error.message : 'Could not load products.');
    }
  }

  return (
    <Card title="Products & SKUs">
      <p className="mb-4 text-sm text-slate-500">
        BR-111 — technical is the primary axis everywhere; there is no &quot;list all
        products&quot;.
      </p>

      <form onSubmit={handleBrowse} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Input
            label="Technical"
            list="technicals"
            value={browseTechnical}
            onChange={(e) => setBrowseTechnical(e.target.value)}
            required
          />
          {technicals.state.status === 'success' && (
            <datalist id="technicals">
              {technicals.state.data.map((technical) => (
                <option key={technical} value={technical} />
              ))}
            </datalist>
          )}
        </div>
        <Button type="submit" variant="secondary" icon={<FiSearch />}>
          Browse
        </Button>
      </form>
      {browseError && (
        <p role="alert" className="mb-4 text-sm text-danger-500">
          {browseError}
        </p>
      )}

      {products && (
        <Table className="mb-4">
          <thead>
            <tr>
              <Th>Brand</Th>
              <Th>HSN</Th>
              <Th>Class</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <Td>{product.brand}</Td>
                <Td>{product.hsn}</Td>
                <Td>{product.class}</Td>
                <Td>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedProduct(product)}>
                    View SKUs
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <CreateProductForm
        defaultTechnical={browseTechnical}
        manufacturers={manufacturers.state.status === 'success' ? manufacturers.state.data : []}
        onCreated={(product) => {
          setProducts((current) => (current ? [...current, product] : [product]));
          setSelectedProduct(product);
        }}
      />

      {selectedProduct && <SkusSection product={selectedProduct} />}
    </Card>
  );
}

function CreateProductForm({
  defaultTechnical,
  manufacturers,
  onCreated,
}: {
  defaultTechnical: string;
  manufacturers: ManufacturerDto[];
  onCreated: (product: ProductDto) => void;
}) {
  const { callApi } = useAuth();
  const [brand, setBrand] = useState('');
  const [technical, setTechnical] = useState(defaultTechnical);
  const [manufacturerId, setManufacturerId] = useState('');
  const [hsn, setHsn] = useState('');
  const [productClass, setProductClass] = useState<'A' | 'B' | 'C'>('B');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await callApi((token) =>
        createProduct(token, { brand, technical, manufacturerId, hsn, class: productClass }),
      );
      onCreated({ productId: result.productId, brand, hsn, class: productClass });
      setBrand('');
      setHsn('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not create this product.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex max-w-md flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Create product</h3>
      <Input
        id="p-brand"
        label="Brand"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        required
      />
      <Input
        id="p-technical"
        label="Technical"
        value={technical}
        onChange={(e) => setTechnical(e.target.value)}
        required
      />
      <Select
        id="p-manufacturer"
        label="Manufacturer"
        value={manufacturerId}
        onChange={(e) => setManufacturerId(e.target.value)}
        required
      >
        <option value="">Select…</option>
        {manufacturers.map((manufacturer) => (
          <option key={manufacturer.manufacturerId} value={manufacturer.manufacturerId}>
            {manufacturer.name}
          </option>
        ))}
      </Select>
      <Input id="p-hsn" label="HSN" value={hsn} onChange={(e) => setHsn(e.target.value)} required />
      <Select
        id="p-class"
        label="Class"
        value={productClass}
        onChange={(e) => setProductClass(e.target.value as 'A' | 'B' | 'C')}
      >
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </Select>

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} icon={<FiPlus />}>
        Create product
      </Button>
    </form>
  );
}

function SkusSection({ product }: { product: ProductDto }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSkusForProduct(token, product.productId)),
    [callApi, product.productId],
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
      const lines = csv.trim().split('\n').slice(1); // drop the header line
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
      const result = await callApi((token) => importSkus(token, product.productId, rows));
      setResults(result);
      retry();
    } catch (error) {
      setImportError(error instanceof ApiError ? error.message : 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold text-slate-900">SKUs for {product.brand}</h3>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No SKUs yet.">
        {(items: SkuDto[]) => (
          <Table>
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
        <p role="alert" className="text-sm text-danger-500">
          {importError}
        </p>
      )}
      {results && (
        <Table>
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
    </div>
  );
}
