import { useEffect, useState } from 'react';
import { NamePicker } from '@/components/ref/NamePicker';
import { NumberInput } from '@/components/ref/NumberInput';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  BASE_UNITS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type BaseUnitValue,
  type ProductCategoryValue,
} from '@/lib/refLabels';
import { refGet, refSend } from '@/lib/refApi';
import { createIdempotencyKey } from '@/utils/id';

type SkuClass = 'A' | 'B' | 'C';

interface Sku {
  id: string;
  packLabel: string;
  unitsPerBox: number;
  skuClass: SkuClass;
}
interface PackSize {
  id: string;
  label: string;
  baseUnit: BaseUnitValue;
  size: number;
}
interface Named {
  id: string;
  name: string;
}
interface HsnCode {
  id: string;
  code: string;
  gstBp: number;
}
interface Product {
  id: string;
  name: string;
  category: ProductCategoryValue;
  taxBp: number;
  manufacturerId: string;
  technicalId: string;
  hsnCodeId: string;
  skus: Sku[];
  packSizes: PackSize[];
}

interface PackDraft {
  key: string;
  packLabel: string;
  unitsPerBox: number | undefined;
  class: SkuClass;
}

const blankPackDraft = (): PackDraft => ({
  key: createIdempotencyKey(),
  packLabel: '',
  unitsPerBox: undefined,
  class: 'B',
});

/** Client-side duplicate preview only; the server has the real say. */
const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Masters → Products & SKUs, as the reference (app/(admin)/masters/products): create a product with all its packs in
 * one submit, add a pack to an existing product, and keep each product's "Pack sizes produced" list.
 */
export function ProductsPage() {
  useDocumentTitle('Products & SKUs');
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Named[]>([]);
  const [technicals, setTechnicals] = useState<Named[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<ProductCategoryValue>('PESTICIDE');
  const [manufacturerId, setManufacturerId] = useState<string | undefined>(undefined);
  const [technicalId, setTechnicalId] = useState<string | undefined>(undefined);
  const [hsnCodeId, setHsnCodeId] = useState<string | undefined>(undefined);
  const [taxPercent, setTaxPercent] = useState<number | undefined>(undefined);
  const [packDrafts, setPackDrafts] = useState<PackDraft[]>([blankPackDraft()]);
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [skuProductId, setSkuProductId] = useState('');
  const [packLabel, setPackLabel] = useState('');
  const [unitsPerBox, setUnitsPerBox] = useState<number | undefined>(undefined);
  const [skuClass, setSkuClass] = useState<SkuClass>('A');
  const [skuErrors, setSkuErrors] = useState<Record<string, string>>({});

  const [packSizeDrafts, setPackSizeDrafts] = useState<
    Record<string, { label: string; baseUnit: BaseUnitValue; size: number | undefined }>
  >({});
  const [packSizeErrors, setPackSizeErrors] = useState<Record<string, string>>({});

  async function load() {
    const data = await refGet<{ products: Product[] }>('/products', { pageSize: 100 });
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    void Promise.all([
      refGet<{ products: Product[] }>('/products', { pageSize: 100 }),
      refGet<{ manufacturers: Named[] }>('/manufacturers', { active: 'true' }),
      refGet<{ technicals: Named[] }>('/technicals', { active: 'true' }),
      refGet<{ hsnCodes: HsnCode[] }>('/hsn-codes', { active: 'true' }),
    ]).then(([productsData, manufacturersData, technicalsData, hsnData]) => {
      setProducts(productsData.products ?? []);
      setManufacturers(manufacturersData.manufacturers ?? []);
      setTechnicals(technicalsData.technicals ?? []);
      setHsnCodes(hsnData.hsnCodes ?? []);
    });
  }, []);

  const nameOf = (list: Named[], id: string) => list.find((item) => item.id === id)?.name ?? '';

  function updatePackDraft(key: string, patch: Partial<PackDraft>) {
    setPackDrafts((drafts) => drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removePackDraft(key: string) {
    setPackDrafts((drafts) => (drafts.length > 1 ? drafts.filter((d) => d.key !== key) : drafts));
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductErrors({});
    if (!manufacturerId || !technicalId || !hsnCodeId) {
      setProductErrors({ _form: 'Select a manufacturer, technical, and HSN code.' });
      return;
    }
    if (taxPercent === undefined) {
      setProductErrors({ taxPercent: 'Enter a tax %.' });
      return;
    }
    if (packDrafts.find((p) => p.packLabel.trim() === '' || p.unitsPerBox === undefined)) {
      setProductErrors({
        _form: 'Fill in every pack row (or remove it) before creating the product.',
      });
      return;
    }
    const seen = new Set<string>();
    for (const p of packDrafts) {
      const k = normalizeLabel(p.packLabel);
      if (seen.has(k)) {
        setProductErrors({ _form: `Two pack rows both say "${p.packLabel.trim()}" — remove one.` });
        return;
      }
      seen.add(k);
    }

    setCreatingProduct(true);
    try {
      const res = await refSend('POST', '/products', {
        name: productName,
        category,
        manufacturerId,
        technicalId,
        hsnCodeId,
        taxBp: Math.round(taxPercent * 100),
        skus: packDrafts.map((p) => ({
          packLabel: p.packLabel.trim(),
          unitsPerBox: p.unitsPerBox,
          skuClass: p.class,
        })),
      });
      if (!res.ok) {
        const field =
          res.field === 'skus' ? '_form' : res.field === 'taxBp' ? 'taxPercent' : res.field;
        setProductErrors({ [field ?? '_form']: res.message });
        return;
      }
      setProductName('');
      setCategory('PESTICIDE');
      setManufacturerId(undefined);
      setTechnicalId(undefined);
      setHsnCodeId(undefined);
      setTaxPercent(undefined);
      setPackDrafts([blankPackDraft()]);
      await load();
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleCreateSku(e: React.FormEvent) {
    e.preventDefault();
    setSkuErrors({});
    if (!skuProductId || packLabel.trim() === '' || unitsPerBox === undefined) {
      setSkuErrors({ _form: 'Fill in every field before adding a SKU.' });
      return;
    }
    const res = await refSend('POST', `/products/${skuProductId}/skus`, {
      packLabel: packLabel.trim(),
      unitsPerBox,
      skuClass,
    });
    if (!res.ok) {
      setSkuErrors({ [res.field ?? '_form']: res.message });
      return;
    }
    setPackLabel('');
    setUnitsPerBox(undefined);
    await load();
  }

  const draftFor = (productId: string) =>
    packSizeDrafts[productId] ?? { label: '', baseUnit: 'LTR' as const, size: undefined };

  async function addPackSize(productId: string) {
    const draft = draftFor(productId);
    setPackSizeErrors((errs) => ({ ...errs, [productId]: '' }));
    if (!draft.label || draft.size === undefined) {
      setPackSizeErrors((errs) => ({ ...errs, [productId]: 'Enter a label and size.' }));
      return;
    }
    const res = await refSend('POST', `/products/${productId}/pack-sizes`, {
      label: draft.label,
      baseUnit: draft.baseUnit,
      size: draft.size,
    });
    if (!res.ok) {
      setPackSizeErrors((errs) => ({ ...errs, [productId]: res.message }));
      return;
    }
    setPackSizeDrafts((d) => ({
      ...d,
      [productId]: { label: '', baseUnit: 'LTR', size: undefined },
    }));
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Products &amp; SKUs</h1>

      <form
        onSubmit={(e) => void handleCreateProduct(e)}
        className="mb-6 flex flex-col gap-4 rounded border border-zinc-200 p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Create product</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="product-name" className="text-sm text-zinc-700">
              Product
            </label>
            <input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            {productErrors.name && <p className="text-xs text-red-600">{productErrors.name}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="product-category" className="text-sm text-zinc-700">
              Category
            </label>
            <select
              id="product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategoryValue)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-56 flex-col gap-1">
            <label className="text-sm text-zinc-700">Technical</label>
            <NamePicker
              ariaLabel="Technical"
              options={technicals.map((t) => ({ id: t.id, label: t.name }))}
              value={technicalId}
              onChange={setTechnicalId}
              placeholder="Search technicals…"
            />
            {productErrors.technicalId && (
              <p className="text-xs text-red-600">{productErrors.technicalId}</p>
            )}
          </div>
          <div className="flex w-56 flex-col gap-1">
            <label className="text-sm text-zinc-700">Manufacturer</label>
            <NamePicker
              ariaLabel="Manufacturer"
              options={manufacturers.map((m) => ({ id: m.id, label: m.name }))}
              value={manufacturerId}
              onChange={setManufacturerId}
              placeholder="Search manufacturers…"
            />
            {productErrors.manufacturerId && (
              <p className="text-xs text-red-600">{productErrors.manufacturerId}</p>
            )}
          </div>
          <div className="flex w-56 flex-col gap-1">
            <label className="text-sm text-zinc-700">HSN</label>
            <NamePicker
              ariaLabel="HSN"
              options={hsnCodes.map((h) => ({
                id: h.id,
                label: h.code,
                sublabel: `${h.gstBp / 100}% GST`,
              }))}
              value={hsnCodeId}
              onChange={(id) => {
                setHsnCodeId(id);
                const hsn = hsnCodes.find((h) => h.id === id);
                if (hsn) setTaxPercent(hsn.gstBp / 100);
              }}
              placeholder="Search HSN codes…"
            />
            {productErrors.hsnCodeId && (
              <p className="text-xs text-red-600">{productErrors.hsnCodeId}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-700">Tax %</label>
            <NumberInput
              ariaLabel="Tax %"
              value={taxPercent}
              onChange={setTaxPercent}
              min={0}
              step={0.01}
              required
              className="w-24 rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            {productErrors.taxPercent && (
              <p className="text-xs text-red-600">{productErrors.taxPercent}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase text-zinc-500">Packs</h3>
          {packDrafts.map((pack, index) => (
            <div key={pack.key} className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Pack label</label>
                <input
                  aria-label={`Pack label ${index + 1}`}
                  value={pack.packLabel}
                  onChange={(e) => updatePackDraft(pack.key, { packLabel: e.target.value })}
                  placeholder="e.g. 500 ML"
                  required
                  className="w-32 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Units in box</label>
                <NumberInput
                  ariaLabel={`Units in box ${index + 1}`}
                  value={pack.unitsPerBox}
                  onChange={(v) => updatePackDraft(pack.key, { unitsPerBox: v })}
                  min={1}
                  step={1}
                  required
                  className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Class</label>
                <select
                  aria-label={`Class ${index + 1}`}
                  value={pack.class}
                  onChange={(e) => updatePackDraft(pack.key, { class: e.target.value as SkuClass })}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="A">A</option>
                  <option value="B">B (Medium)</option>
                  <option value="C">C</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removePackDraft(pack.key)}
                disabled={packDrafts.length === 1}
                aria-label="Delete pack row"
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPackDrafts((d) => [...d, blankPackDraft()])}
            className="self-start rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Add pack
          </button>
        </div>

        {productErrors._form && <p className="text-xs text-red-600">{productErrors._form}</p>}
        <button
          type="submit"
          disabled={creatingProduct}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Create product
        </button>
      </form>

      <h2 className="mb-2 text-sm font-semibold text-zinc-900">
        Add a pack to an existing product
      </h2>
      <form
        onSubmit={(e) => void handleCreateSku(e)}
        className="mb-8 flex flex-wrap items-end gap-3 rounded border border-zinc-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="sku-product" className="text-sm text-zinc-700">
            Product
          </label>
          <select
            id="sku-product"
            value={skuProductId}
            onChange={(e) => setSkuProductId(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sku-pack-label" className="text-sm text-zinc-700">
            Pack label
          </label>
          <input
            id="sku-pack-label"
            value={packLabel}
            onChange={(e) => setPackLabel(e.target.value)}
            placeholder="e.g. 1 LTR"
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {skuErrors.packLabel && <p className="text-xs text-red-600">{skuErrors.packLabel}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-700">Units per box</label>
          <NumberInput
            ariaLabel="Units per box"
            value={unitsPerBox}
            onChange={setUnitsPerBox}
            min={1}
            step={1}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sku-class" className="text-sm text-zinc-700">
            Class
          </label>
          <select
            id="sku-class"
            value={skuClass}
            onChange={(e) => setSkuClass(e.target.value as SkuClass)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add SKU
        </button>
        {skuErrors._form && <p className="text-xs text-red-600">{skuErrors._form}</p>}
      </form>

      <div className="flex flex-col gap-4">
        {products.map((p) => {
          const draft = draftFor(p.id);
          const hsn = hsnCodes.find((h) => h.id === p.hsnCodeId);
          return (
            <div
              key={p.id}
              className="rounded border border-zinc-200 p-4"
              data-testid="product-card"
            >
              <h2 className="text-sm font-semibold text-zinc-900">
                {p.name}{' '}
                <span className="font-normal text-zinc-400">
                  — {PRODUCT_CATEGORY_LABELS[p.category]}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {nameOf(manufacturers, p.manufacturerId)} · {nameOf(technicals, p.technicalId)} ·
                HSN {hsn?.code ?? ''} · Tax {p.taxBp / 100}%
              </p>

              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1">Pack</th>
                    <th className="py-1">Units/box</th>
                    <th className="py-1">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {p.skus.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-100">
                      <td className="py-1">{s.packLabel}</td>
                      <td className="py-1">{s.unitsPerBox}</td>
                      <td className="py-1">{s.skuClass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 border-t border-zinc-100 pt-3">
                <h3 className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                  Pack sizes produced
                </h3>
                <div className="mb-2 flex flex-wrap gap-2">
                  {p.packSizes.map((ps) => (
                    <span
                      key={ps.id}
                      className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                    >
                      {ps.label}
                    </span>
                  ))}
                  {p.packSizes.length === 0 && (
                    <span className="text-xs text-zinc-400">None recorded</span>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    aria-label={`Pack size label for ${p.name}`}
                    value={draft.label}
                    onChange={(e) =>
                      setPackSizeDrafts((d) => ({
                        ...d,
                        [p.id]: { ...draft, label: e.target.value },
                      }))
                    }
                    placeholder="e.g. 250 ML"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                  <select
                    aria-label={`Pack size unit for ${p.name}`}
                    value={draft.baseUnit}
                    onChange={(e) =>
                      setPackSizeDrafts((d) => ({
                        ...d,
                        [p.id]: { ...draft, baseUnit: e.target.value as BaseUnitValue },
                      }))
                    }
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  >
                    {BASE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <NumberInput
                    ariaLabel={`Pack size for ${p.name}`}
                    value={draft.size}
                    onChange={(v) =>
                      setPackSizeDrafts((d) => ({ ...d, [p.id]: { ...draft, size: v } }))
                    }
                    min={0}
                    step={0.01}
                    className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => void addPackSize(p.id)}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white"
                  >
                    Add pack size
                  </button>
                </div>
                {packSizeErrors[p.id] && (
                  <p className="mt-1 text-xs text-red-600">{packSizeErrors[p.id]}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
