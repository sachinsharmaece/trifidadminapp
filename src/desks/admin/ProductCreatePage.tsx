import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import { createProduct } from '../../api/catalog';
import type { PackUnit, ProductPackInput } from '../../api/catalog';
import type { ProductCategory } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { DevNote } from '../../components/dev/DevNote';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  AddHsnModal,
  AddManufacturerModal,
  AddTechnicalModal,
  CATEGORY_OPTIONS,
  MasterPicker,
  PACK_UNIT_OPTIONS,
  useProductMasters,
} from './productMasters';

interface PackRow {
  packSize: string;
  unit: PackUnit;
  unitsPerBox: string;
}

const EMPTY_PACK: PackRow = { packSize: '', unit: 'LTR', unitsPerBox: '' };

function isBlank(row: PackRow): boolean {
  return row.packSize.trim() === '' && row.unitsPerBox.trim() === '';
}

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

type AddingKind = 'technical' | 'manufacturer' | 'hsn';

const PACK_FIELD_CLASSES =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

/** Manage → Products → Create. */
export function ProductCreatePage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const masters = useProductMasters();

  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('pesticide');
  const [technical, setTechnical] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [hsn, setHsn] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [productClass, setProductClass] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [packs, setPacks] = useState<PackRow[]>([{ ...EMPTY_PACK }]);
  const [adding, setAdding] = useState<{ kind: AddingKind; typed: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  function updatePack(index: number, patch: Partial<PackRow>): void {
    setPacks((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    const missing: Record<string, string> = {};
    if (!technical) missing.technical = 'Pick a technical, or add a new one.';
    if (!manufacturerId) missing.manufacturerId = 'Pick a manufacturer, or add a new one.';
    if (!hsn) missing.hsn = 'Pick an HSN, or add a new one.';
    if (taxPercent === '') missing.taxPercent = 'Enter the tax %.';
    const filled = packs.filter((row) => !isBlank(row));
    if (filled.some((row) => !(Number(row.packSize) > 0) || !(Number(row.unitsPerBox) >= 1))) {
      missing.packs = 'Each pack needs a size and the units in a box.';
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const packInputs: ProductPackInput[] = filled.map((row) => ({
        packSize: Number(row.packSize),
        unit: row.unit,
        unitsPerBox: Number(row.unitsPerBox),
      }));
      const result = await callApi((token) =>
        createProduct(token, {
          brand,
          technical,
          manufacturerId,
          hsn,
          category,
          taxPercent: Number(taxPercent),
          class: productClass,
          packs: packInputs,
        }),
      );
      navigate(`/manage/products/${result.productId}`);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(
          submitError.fieldErrors ??
            (submitError.field ? { [submitError.field]: submitError.message } : {}),
        );
        if (!submitError.fieldErrors && !submitError.field) setError(submitError.message);
      } else {
        setError('Could not create this product.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/manage/products')}>
          Products
        </Button>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Create product</h1>
      <DevNote screen="admin_products_create" />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="p-brand"
            label="Product"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            error={fieldErrors.brand}
            required
          />
          <Select
            id="p-category"
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            error={fieldErrors.category}
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
              onPick={(value) => setTechnical(value)}
              onAddNew={(typed) => setAdding({ kind: 'technical', typed })}
            />
            {fieldErrors.technical && (
              <p role="alert" className="mt-1 text-sm text-danger-500">
                {fieldErrors.technical}
              </p>
            )}
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
              }}
              onAddNew={(typed) => setAdding({ kind: 'manufacturer', typed })}
            />
            {fieldErrors.manufacturerId && (
              <p role="alert" className="mt-1 text-sm text-danger-500">
                {fieldErrors.manufacturerId}
              </p>
            )}
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
                  // The HSN master carries the default rate; it stays editable here.
                  const rate = masters.hsns.find((h) => h.code === value)?.taxPercent;
                  if (rate !== undefined) setTaxPercent(String(rate));
                }}
                onAddNew={(typed) => setAdding({ kind: 'hsn', typed })}
              />
              {fieldErrors.hsn && (
                <p role="alert" className="mt-1 text-sm text-danger-500">
                  {fieldErrors.hsn}
                </p>
              )}
            </div>
            <Input
              id="p-tax"
              label="Tax %"
              type="number"
              min={0}
              max={100}
              step="any"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              error={fieldErrors.taxPercent}
              required
            />
          </div>

          <Select
            id="p-class"
            label="Class"
            value={productClass}
            onChange={(e) => setProductClass(e.target.value as 'High' | 'Medium' | 'Low')}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </Select>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Packs</legend>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 text-sm font-medium text-slate-500">
              <span>Pack size</span>
              <span>Unit</span>
              <span>Units in box</span>
              <span className="w-9" />
            </div>
            {packs.map((row, index) => (
              <div key={index}>
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                  <input
                    aria-label={`Pack ${index + 1} size`}
                    type="number"
                    min={0}
                    step="any"
                    value={row.packSize}
                    onChange={(e) => updatePack(index, { packSize: e.target.value })}
                    className={PACK_FIELD_CLASSES}
                  />
                  <select
                    aria-label={`Pack ${index + 1} unit`}
                    value={row.unit}
                    onChange={(e) => updatePack(index, { unit: e.target.value as PackUnit })}
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
                    onChange={(e) => updatePack(index, { unitsPerBox: e.target.value })}
                    className={PACK_FIELD_CLASSES}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove pack ${index + 1}`}
                    disabled={packs.length === 1 && isBlank(row)}
                    icon={<FiTrash2 />}
                    onClick={() =>
                      setPacks((rows) =>
                        rows.length === 1
                          ? [{ ...EMPTY_PACK }]
                          : rows.filter((_, i) => i !== index),
                      )
                    }
                  />
                </div>
                {boxContents(row) && (
                  <p className="mt-1 text-xs text-slate-500">One box holds {boxContents(row)}.</p>
                )}
              </div>
            ))}
            {fieldErrors.packs && (
              <p role="alert" className="text-sm text-danger-500">
                {fieldErrors.packs}
              </p>
            )}
            <div>
              <Button
                variant="secondary"
                size="sm"
                icon={<FiPlus />}
                onClick={() => setPacks((rows) => [...rows, { ...EMPTY_PACK }])}
              >
                Add pack
              </Button>
            </div>
          </fieldset>

          {error && Object.keys(fieldErrors).length === 0 && (
            <p role="alert" className="text-sm text-danger-500">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} icon={<FiPlus />}>
            Create product
          </Button>
        </form>
      </Card>

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
    </div>
  );
}
