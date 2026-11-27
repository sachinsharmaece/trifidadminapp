import { useState } from 'react';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { CurrencyInput } from '@/components/ref/CurrencyInput';
import { NumberInput } from '@/components/ref/NumberInput';
import { QuantityStepper } from '@/components/ref/QuantityStepper';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import {
  computeBoxValuePaise,
  computeLandingRatePaisePerUnit,
  formatPaiseAsINR,
  rupeesToPaise,
} from '@/lib/refMoney';
import { areaText, type RefProduct, type RefSeller } from './refTypes';

interface SkuOption {
  id: string;
  packLabel: string;
  unitsPerBox: number;
  skuClass: string;
  productName: string;
}

/** Our field names → the reference form's. */
const FIELD_OF: Record<string, string> = {
  ratePaisePerUnit: 'rateRupees',
  exRatePaisePerUnit: 'exRateRupees',
  colPaisePerBox: 'colRupeesPerBox',
};

/** Purchase → New listing, as the reference (app/(purchase)/listings/new): an ad-hoc listing for any seller. */
export function NewListingPage() {
  useDocumentTitle('New listing');
  const [sellers, setSellers] = useState<RefSeller[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);

  const [sellerId, setSellerId] = useState<string | undefined>(undefined);
  const [skuId, setSkuId] = useState('');
  const [rateType, setRateType] = useState<'FOR' | 'EX'>('FOR');
  const [rateRupees, setRateRupees] = useState<number | undefined>(undefined);
  const [exRateRupees, setExRateRupees] = useState<number | undefined>(undefined);
  const [colRupeesPerBox, setColRupeesPerBox] = useState<number | undefined>(undefined);
  const [expiryBand, setExpiryBand] = useState('M12_PLUS');
  const [moqBoxes, setMoqBoxes] = useState<number | undefined>(1);
  const [provenance, setProvenance] = useState('OWN_STOCK');
  const [quantityBoxes, setQuantityBoxes] = useState<number | undefined>(undefined);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmPrompt, setConfirmPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useOnMount(async () => {
    const [sellersData, productsData] = await Promise.all([
      refGet<{ sellers: RefSeller[] }>('/sellers', { pageSize: 100 }),
      refGet<{ products: RefProduct[] }>('/products', { pageSize: 100 }),
    ]);
    setSellers((sellersData.sellers ?? []).filter((s) => s.active));
    setSkus(
      (productsData.products ?? []).flatMap((p) =>
        p.skus
          .filter((s) => s.active !== false)
          .map((s) => ({
            id: s.id,
            packLabel: s.packLabel,
            unitsPerBox: s.unitsPerBox,
            skuClass: s.skuClass,
            productName: p.name,
          })),
      ),
    );
  });

  const sellerOptions: NamePickerOption[] = sellers.map((s) => ({
    id: s.id,
    label: s.firmName,
    sublabel: areaText(s.tehsil),
  }));

  const selectedSku = skus.find((s) => s.id === skuId);
  const landingRatePaise =
    selectedSku && exRateRupees !== undefined && colRupeesPerBox !== undefined
      ? computeLandingRatePaisePerUnit(
          rupeesToPaise(exRateRupees),
          rupeesToPaise(colRupeesPerBox),
          selectedSku.unitsPerBox,
        )
      : undefined;
  const ratePaise =
    rateType === 'EX'
      ? landingRatePaise
      : rateRupees !== undefined
        ? rupeesToPaise(rateRupees)
        : undefined;
  const readBack =
    selectedSku && ratePaise !== undefined
      ? `${formatPaiseAsINR(ratePaise)} per unit × ${selectedSku.unitsPerBox} units per box = ${formatPaiseAsINR(
          computeBoxValuePaise(ratePaise, selectedSku.unitsPerBox),
        )} per box`
      : null;

  function resetForm() {
    setSellerId(undefined);
    setSkuId('');
    setRateType('FOR');
    setRateRupees(undefined);
    setExRateRupees(undefined);
    setColRupeesPerBox(undefined);
    setExpiryBand('M12_PLUS');
    setMoqBoxes(1);
    setProvenance('OWN_STOCK');
    setQuantityBoxes(undefined);
    setConfirmPrompt(null);
  }

  async function submit(confirmed: boolean) {
    setFieldErrors({});
    setSuccessMessage(null);
    setLoading(true);
    const createdLabel = selectedSku
      ? `${selectedSku.productName} — ${selectedSku.packLabel}`
      : 'Listing';
    try {
      const rate =
        rateType === 'FOR'
          ? { rateType, ratePaisePerUnit: rupeesToPaise(rateRupees ?? 0) }
          : {
              rateType,
              exRatePaisePerUnit: rupeesToPaise(exRateRupees ?? 0),
              colPaisePerBox: rupeesToPaise(colRupeesPerBox ?? 0),
            };
      const res = await refSend('POST', '/listings', {
        sellerId,
        skuId,
        ...rate,
        expiryBand,
        moqBoxes,
        provenance,
        quantityBoxes,
        ...(confirmed ? { confirmDecrease: true } : {}),
      });
      if (!res.ok) {
        if (res.code === 'RATE_DECREASE_NEEDS_CONFIRMATION') {
          setConfirmPrompt(res.message);
          return;
        }
        const field = res.field ? (FIELD_OF[res.field] ?? res.field) : '_form';
        setFieldErrors({ [field]: res.message });
        return;
      }
      resetForm();
      setSuccessMessage(`${createdLabel} listed.`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateFilled =
      rateType === 'FOR'
        ? rateRupees !== undefined
        : exRateRupees !== undefined && colRupeesPerBox !== undefined;
    if (!sellerId || !skuId || !rateFilled || quantityBoxes === undefined || !moqBoxes) {
      setFieldErrors({ _form: 'Fill in every field before submitting.' });
      return;
    }
    await submit(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">New listing</h1>
      <p className="mb-4 text-xs text-zinc-400">
        Every listing is visible all-India by default. For the usual flow, open a seller&rsquo;s
        page and use &ldquo;His products&rdquo; instead — this form is for an ad-hoc entry.
      </p>

      {successMessage && (
        <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-4 rounded border border-zinc-200 p-4"
      >
        <Field label="Seller" error={fieldErrors.sellerId}>
          <NamePicker
            ariaLabel="Seller"
            options={sellerOptions}
            value={sellerId}
            onChange={setSellerId}
            placeholder="Search sellers…"
          />
        </Field>

        <Field label="Product / SKU" error={fieldErrors.skuId}>
          <select
            aria-label="Product / SKU"
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.productName} — {s.packLabel} (Class {s.skuClass})
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col gap-2">
          <div className="inline-flex self-start overflow-hidden rounded border border-zinc-300">
            <button
              type="button"
              aria-pressed={rateType === 'FOR'}
              onClick={() => setRateType('FOR')}
              className={`px-3 py-1.5 text-xs font-semibold ${rateType === 'FOR' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600'}`}
            >
              FOR Indore
            </button>
            <button
              type="button"
              aria-pressed={rateType === 'EX'}
              onClick={() => setRateType('EX')}
              className={`px-3 py-1.5 text-xs font-semibold ${rateType === 'EX' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600'}`}
            >
              Ex-rate
            </button>
          </div>

          {rateType === 'FOR' ? (
            <Field label="Rate (₹ per unit)" error={fieldErrors.rateRupees}>
              <CurrencyInput
                ariaLabel="Rate (₹ per unit)"
                value={rateRupees}
                onChange={setRateRupees}
                required
              />
            </Field>
          ) : (
            <>
              <Field label="Ex rate (₹ per unit)" error={fieldErrors.exRateRupees}>
                <CurrencyInput
                  ariaLabel="Ex rate (₹ per unit)"
                  value={exRateRupees}
                  onChange={setExRateRupees}
                  required
                />
              </Field>
              <Field label="COL (₹ per box)" error={fieldErrors.colRupeesPerBox}>
                <CurrencyInput
                  ariaLabel="COL (₹ per box)"
                  value={colRupeesPerBox}
                  onChange={setColRupeesPerBox}
                  required
                />
              </Field>
              <div className="rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
                Landing rate per unit:{' '}
                <strong className="tabular-nums">
                  {landingRatePaise !== undefined
                    ? `${formatPaiseAsINR(landingRatePaise)} per unit`
                    : '—'}
                </strong>
              </div>
            </>
          )}
        </div>

        {readBack && (
          <div
            className="rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
            data-testid="read-back"
          >
            {readBack}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry band">
            <select
              aria-label="Expiry band"
              value={expiryBand}
              onChange={(e) => setExpiryBand(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="M6_TO_9">6–9 months</option>
              <option value="M9_TO_12">9–12 months</option>
              <option value="M12_PLUS">12+ months</option>
            </select>
          </Field>
          <Field label="MOQ (boxes)" error={fieldErrors.moqBoxes}>
            <QuantityStepper ariaLabel="MOQ (boxes)" value={moqBoxes} onChange={setMoqBoxes} />
          </Field>
          <Field label="Provenance">
            <select
              aria-label="Provenance"
              value={provenance}
              onChange={(e) => setProvenance(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="OWN_STOCK">Own stock</option>
              <option value="SOURCED">Company billing</option>
            </select>
          </Field>
        </div>

        <Field label="Quantity (boxes)" error={fieldErrors.quantityBoxes}>
          <NumberInput
            ariaLabel="Quantity (boxes)"
            value={quantityBoxes}
            onChange={setQuantityBoxes}
            min={1}
            step={1}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>

        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}

        {confirmPrompt && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p>{confirmPrompt}</p>
            <button
              type="button"
              onClick={() => void submit(true)}
              className="mt-2 rounded bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900"
            >
              Confirm and submit anyway
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Create listing
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-zinc-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
