import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import {
  addProductPacks,
  createProduct,
  updateProduct,
  updateSku,
  type AdminSkuDto,
  type PackUnit,
  type ProductPackInput,
} from '../../api/catalog';
import type { ProductCategory, ProductDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  AddHsnModal,
  AddManufacturerModal,
  AddTechnicalModal,
  CATEGORY_OPTIONS,
  MasterPicker,
  PACK_UNIT_OPTIONS,
  useProductMasters,
} from './productMasters';

/**
 * 24 Oct — one form for Manage → Products, in create and edit mode, so the
 * two can never drift apart again: the same fields, master pickers, checks
 * next to each field, packs typed as size + unit, Idempotency-Key and
 * success message. Edit differs only in starting from the product, showing
 * "Active", and listing the packs it already has — whose unit is fixed
 * (orders, stock and prices hang off it): change its size in that unit, or
 * make it inactive and add a new pack.
 */
interface PackRow {
  rowKey: string;
  skuId?: string;
  packSize: string;
  unit: PackUnit;
  unitsPerBox: string;
  active: boolean;
  state?: 'draft' | 'live';
}

let rowCounter = 0;
const newRow = (): PackRow => ({
  rowKey: `new-${(rowCounter += 1)}`,
  packSize: '',
  unit: 'LTR',
  unitsPerBox: '',
  active: true,
});

const isBlank = (row: PackRow) => !row.skuId && !row.packSize.trim() && !row.unitsPerBox.trim();

/** What one box holds, in the base unit — mirrors the server's BR-055 rule (PC ignores pack size). */
function boxContents(row: PackRow): string | null {
  const size = Number(row.packSize);
  const boxes = Number(row.unitsPerBox);
  if (!size || !boxes) return null;
  if (row.unit === 'PC') return `${boxes} PC`;
  const factor = row.unit === 'ML' || row.unit === 'GM' ? 1000 : 1;
  const base = row.unit === 'ML' || row.unit === 'LTR' ? 'LTR' : 'KG';
  return `${Math.round(((size * boxes) / factor) * 1e6) / 1e6} ${base}`;
}

/** The same pack typed twice — 500 ML and 0.5 LTR are one pack. */
const packIdentity = (row: PackRow) => {
  const factor = row.unit === 'ML' || row.unit === 'GM' ? 1000 : 1;
  const base = row.unit === 'ML' ? 'LTR' : row.unit === 'GM' ? 'KG' : row.unit;
  return `${base}:${Math.round((Number(row.packSize) / factor) * 1e6)}`;
};

const FIELDS = [
  'brand',
  'category',
  'technical',
  'manufacturerId',
  'hsn',
  'taxPercent',
  'class',
  'packs',
  'unit',
  'packSize',
];

const PACK_FIELD_CLASSES =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500';

type AddingKind = 'technical' | 'manufacturer' | 'hsn';

export function ProductForm(
  props:
    | { mode: 'create'; onSaved: (productId: string) => void }
    | {
        mode: 'edit';
        product: ProductDto;
        packs: AdminSkuDto[];
        onSaved: () => void;
        onCancel: () => void;
      },
) {
  const { callApi } = useAuth();
  const masters = useProductMasters();
  const product = props.mode === 'edit' ? props.product : null;

  const [brand, setBrand] = useState(product?.brand ?? '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'pesticide');
  const [technical, setTechnical] = useState(product?.technical ?? '');
  const [manufacturerId, setManufacturerId] = useState(product?.manufacturerId ?? '');
  const [manufacturerName, setManufacturerName] = useState(product?.manufacturerName ?? '');
  const [hsn, setHsn] = useState(product?.hsn ?? '');
  const [taxPercent, setTaxPercent] = useState(
    product?.taxPercent !== undefined ? String(product.taxPercent) : '',
  );
  const [productClass, setProductClass] = useState<'High' | 'Medium' | 'Low'>(
    product?.class ?? 'Medium',
  );
  const [active, setActive] = useState(product?.active ?? true);
  // Read once, when the form opens.
  const [packs, setPacks] = useState<PackRow[]>(() => {
    const existing =
      props.mode === 'edit'
        ? props.packs.map((p) => ({
            rowKey: p.skuId,
            skuId: p.skuId,
            packSize: String(p.displaySize),
            unit: p.unit,
            unitsPerBox: String(p.unitsPerBox),
            active: p.active !== false,
            state: p.state,
          }))
        : [];
    return existing.length > 0 ? existing : [newRow()];
  });
  const [adding, setAdding] = useState<{ kind: AddingKind; typed: string } | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const save = useFormSubmit<string>({
    fields: FIELDS,
    success: props.mode === 'create' ? 'Product created.' : 'Changes saved.',
    toastOnSuccess: true,
    onSuccess: (productId) =>
      props.mode === 'create' ? props.onSaved(productId) : props.onSaved(),
  });
  const errors = { ...localErrors, ...save.fieldErrors };

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

  function clear(field: string): void {
    setLocalErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
    save.clearFieldError(field);
  }

  function updatePack(rowKey: string, patch: Partial<PackRow>): void {
    setPacks((rows) => rows.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)));
    clear('packs');
  }

  function checkLocally(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!brand.trim()) found.brand = 'Enter the product name.';
    if (!technical) found.technical = 'Pick a technical, or add a new one.';
    if (!manufacturerId) found.manufacturerId = 'Pick a manufacturer, or add a new one.';
    if (!hsn) found.hsn = 'Pick an HSN, or add a new one.';
    if (taxPercent === '' || Number(taxPercent) < 0 || Number(taxPercent) > 100) {
      found.taxPercent = 'Enter the tax % (0 to 100).';
    }
    const filled = packs.filter((row) => !isBlank(row));
    if (filled.some((row) => !(Number(row.packSize) > 0) || !(Number(row.unitsPerBox) >= 1))) {
      found.packs = 'Each pack needs a size and the units in a box.';
    } else {
      const seen = new Set<string>();
      for (const row of filled) {
        const id = packIdentity(row);
        if (seen.has(id)) {
          found.packs = `The pack ${row.packSize} ${row.unit} is listed twice.`;
          break;
        }
        seen.add(id);
      }
    }
    return found;
  }

  const toPackInput = (row: PackRow): ProductPackInput => ({
    packSize: Number(row.packSize),
    unit: row.unit,
    unitsPerBox: Number(row.unitsPerBox),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const found = checkLocally();
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;

    const fields = {
      brand: brand.trim(),
      category,
      technical,
      manufacturerId,
      hsn,
      taxPercent: Number(taxPercent),
      class: productClass,
    };
    const newPacks = packs.filter((row) => !row.skuId && !isBlank(row)).map(toPackInput);

    void save.submit(async (key) => {
      if (props.mode === 'create') {
        const created = await callApi((token) =>
          createProduct(token, { ...fields, packs: newPacks }, key),
        );
        return created.productId;
      }
      // Edit saves in steps, each under its own key derived from this
      // attempt's, so a retry after a network failure repeats none of them.
      const productId = props.product.productId;
      await callApi((token) => updateProduct(token, productId, { ...fields, active }, `${key}-p`));
      for (const row of packs.filter((r) => r.skuId)) {
        const before = props.packs.find((p) => p.skuId === row.skuId)!;
        const changed =
          Number(row.packSize) !== before.displaySize ||
          Number(row.unitsPerBox) !== before.unitsPerBox ||
          row.active !== (before.active !== false);
        if (!changed) continue;
        await callApi((token) =>
          updateSku(
            token,
            row.skuId!,
            {
              unit: row.unit,
              packSize: Number(row.packSize),
              unitsPerBox: Number(row.unitsPerBox),
              active: row.active,
            },
            `${key}-s-${row.skuId}`,
          ),
        );
      }
      if (newPacks.length > 0) {
        await callApi((token) => addProductPacks(token, productId, newPacks, `${key}-a`));
      }
      return productId;
    });
  }

  const fieldError = (field: string) =>
    errors[field] ? (
      <p role="alert" className="mt-1 text-sm text-danger-500">
        {errors[field]}
      </p>
    ) : null;

  return (
    <Card title={props.mode === 'create' ? undefined : 'Edit product'} className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="p-brand"
          label="Product"
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            clear('brand');
          }}
          error={errors.brand}
          required
        />
        <Select
          id="p-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
          error={errors.category}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div>
          <MasterPicker
            label="Technical"
            required
            options={technicalOptions}
            value={technical}
            selectedLabel={technical}
            addLabel="Add new technical"
            onPick={(value) => {
              setTechnical(value);
              clear('technical');
            }}
            onAddNew={(typed) => setAdding({ kind: 'technical', typed })}
          />
          {fieldError('technical')}
        </div>

        <div>
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
              clear('manufacturerId');
            }}
            onAddNew={(typed) => setAdding({ kind: 'manufacturer', typed })}
          />
          {fieldError('manufacturerId')}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <MasterPicker
              label="HSN"
              required
              options={hsnOptions}
              value={hsn}
              selectedLabel={hsn}
              addLabel="Add new HSN"
              onPick={(value) => {
                setHsn(value);
                clear('hsn');
                // The HSN master carries the default rate; it stays editable here.
                const rate = masters.hsns.find((h) => h.code === value)?.taxPercent;
                if (rate !== undefined) {
                  setTaxPercent(String(rate));
                  clear('taxPercent');
                }
              }}
              onAddNew={(typed) => setAdding({ kind: 'hsn', typed })}
            />
            {fieldError('hsn')}
          </div>
          <Input
            id="p-tax"
            label="Tax %"
            type="number"
            min={0}
            max={100}
            step="any"
            value={taxPercent}
            onChange={(e) => {
              setTaxPercent(e.target.value);
              clear('taxPercent');
            }}
            error={errors.taxPercent}
            required
          />
        </div>

        <Select
          id="p-class"
          label="Class"
          value={productClass}
          onChange={(e) => setProductClass(e.target.value as 'High' | 'Medium' | 'Low')}
          error={errors.class}
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </Select>

        {props.mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">Packs</legend>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 text-sm font-medium text-slate-500">
            <span>Pack size</span>
            <span>Unit</span>
            <span>Units in box</span>
            <span className="w-24" />
          </div>
          {packs.map((row, index) => (
            <div key={row.rowKey}>
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                <input
                  aria-label={`Pack ${index + 1} size`}
                  type="number"
                  min={0}
                  step="any"
                  value={row.packSize}
                  onChange={(e) => updatePack(row.rowKey, { packSize: e.target.value })}
                  className={PACK_FIELD_CLASSES}
                />
                <select
                  aria-label={`Pack ${index + 1} unit`}
                  value={row.unit}
                  disabled={Boolean(row.skuId)}
                  title={row.skuId ? 'A pack’s unit is fixed once it exists.' : undefined}
                  onChange={(e) => updatePack(row.rowKey, { unit: e.target.value as PackUnit })}
                  className={PACK_FIELD_CLASSES}
                >
                  {PACK_UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Pack ${index + 1} units in box`}
                  type="number"
                  min={1}
                  step={1}
                  value={row.unitsPerBox}
                  onChange={(e) => updatePack(row.rowKey, { unitsPerBox: e.target.value })}
                  className={PACK_FIELD_CLASSES}
                />
                <div className="flex w-24 items-center gap-1">
                  {row.skuId ? (
                    <label className="flex items-center gap-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        aria-label={`Pack ${index + 1} active`}
                        className="h-4 w-4 rounded border-slate-300"
                        checked={row.active}
                        onChange={(e) => updatePack(row.rowKey, { active: e.target.checked })}
                      />
                      Active
                    </label>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove pack ${index + 1}`}
                      disabled={packs.length === 1 && isBlank(row)}
                      icon={<FiTrash2 />}
                      onClick={() =>
                        setPacks((rows) =>
                          rows.length === 1
                            ? [newRow()]
                            : rows.filter((r) => r.rowKey !== row.rowKey),
                        )
                      }
                    />
                  )}
                </div>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {boxContents(row) && <span>One box holds {boxContents(row)}.</span>}
                {row.skuId && row.state === 'draft' && <Badge tone="warn">draft</Badge>}
                {row.skuId && (
                  <span>Unit fixed — make it inactive and add a new pack to change it.</span>
                )}
              </p>
            </div>
          ))}
          {fieldError('packs') ?? fieldError('packSize') ?? fieldError('unit')}
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<FiPlus />}
              onClick={() => setPacks((rows) => [...rows, newRow()])}
            >
              Add pack
            </Button>
          </div>
        </fieldset>

        {save.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {save.formError}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            loading={save.submitting}
            icon={props.mode === 'create' ? <FiPlus /> : <FiSave />}
          >
            {props.mode === 'create' ? 'Create product' : 'Save changes'}
          </Button>
          {props.mode === 'edit' && (
            <Button type="button" variant="secondary" icon={<FiX />} onClick={props.onCancel}>
              Cancel
            </Button>
          )}
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
            clear('technical');
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
            clear('manufacturerId');
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
            clear('hsn');
            setAdding(null);
          }}
        />
      )}
    </Card>
  );
}
