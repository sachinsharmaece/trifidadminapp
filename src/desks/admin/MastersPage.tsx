import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
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
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import type { ManufacturerDto, ProductDto, SkuDto, SkuImportRowResult } from '../../api/dto';

export function MastersPage() {
  return (
    <main>
      <h1>Masters</h1>
      <TehsilsSection />
      <ManufacturersSection />
      <ProductsSection />
    </main>
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
    <section>
      <h2>Tehsils</h2>
      <p className="hint">
        {'BR-080 — name is not a unique key; every picker disambiguates by district.'}
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No tehsils yet.">
        {(items) => (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>District</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tehsil) => (
                <tr key={tehsil.tehsilId}>
                  <td>{tehsil.name}</td>
                  <td>{tehsil.district}</td>
                  <td>{tehsil.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
      <form onSubmit={handleSubmit} className="inline-form">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          placeholder="District"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          required
        />
        <input
          placeholder="State"
          value={stateName}
          onChange={(e) => setStateName(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          Add tehsil
        </button>
      </form>
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
    </section>
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
    <section>
      <h2>Manufacturers</h2>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No manufacturers yet.">
        {(items) => (
          <ul>
            {items.map((manufacturer) => (
              <li key={manufacturer.manufacturerId}>{manufacturer.name}</li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
      <form onSubmit={handleSubmit} className="inline-form">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" disabled={submitting}>
          Add manufacturer
        </button>
      </form>
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
    </section>
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
    <section>
      <h2>Products &amp; SKUs</h2>
      <p className="hint">
        {'BR-111 — technical is the primary axis everywhere; there is no "list all products".'}
      </p>

      <form onSubmit={handleBrowse} className="inline-form">
        <input
          list="technicals"
          placeholder="Technical"
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
        <button type="submit">Browse</button>
      </form>
      {browseError && (
        <p className="note-urgent" role="alert">
          {browseError}
        </p>
      )}

      {products && (
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>HSN</th>
              <th>Class</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>{product.brand}</td>
                <td>{product.hsn}</td>
                <td>{product.class}</td>
                <td>
                  <button type="button" onClick={() => setSelectedProduct(product)}>
                    View SKUs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </section>
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
    <form onSubmit={handleSubmit} className="stacked-form">
      <h3>Create product</h3>
      <label htmlFor="p-brand">Brand</label>
      <input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} required />

      <label htmlFor="p-technical">Technical</label>
      <input
        id="p-technical"
        value={technical}
        onChange={(e) => setTechnical(e.target.value)}
        required
      />

      <label htmlFor="p-manufacturer">Manufacturer</label>
      <select
        id="p-manufacturer"
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
      </select>

      <label htmlFor="p-hsn">HSN</label>
      <input id="p-hsn" value={hsn} onChange={(e) => setHsn(e.target.value)} required />

      <label htmlFor="p-class">Class</label>
      <select
        id="p-class"
        value={productClass}
        onChange={(e) => setProductClass(e.target.value as 'A' | 'B' | 'C')}
      >
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>

      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting}>
        Create product
      </button>
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
    <div>
      <h3>SKUs for {product.brand}</h3>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No SKUs yet.">
        {(items: SkuDto[]) => (
          <table>
            <thead>
              <tr>
                <th>Pack</th>
                <th>Base unit</th>
                <th>Units/box</th>
                <th>Base units/box</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sku) => (
                <tr key={sku.skuId}>
                  <td>{sku.packLabel}</td>
                  <td>{sku.baseUnit}</td>
                  <td>{sku.unitsPerBox}</td>
                  <td>{sku.baseUnitsPerBox}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>

      <form onSubmit={handleImport}>
        <label htmlFor="sku-csv">
          Import rows (BR-055 — a row failing the baseUnitsPerBox rule is rejected, not imported)
        </label>
        <textarea id="sku-csv" rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Importing…' : 'Import'}
        </button>
      </form>
      {importError && (
        <p className="note-urgent" role="alert">
          {importError}
        </p>
      )}
      {results && (
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>Result</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.index}>
                <td>{row.index + 1}</td>
                <td className={row.accepted ? '' : 'note-urgent'}>
                  {row.accepted ? 'Accepted' : 'Rejected'}
                </td>
                <td>{row.accepted ? row.skuId : row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
