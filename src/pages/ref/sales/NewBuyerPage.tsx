import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { tierLabel } from '@/lib/refLabels';

interface Tehsil {
  id: string;
  name: string;
  district: string;
  state: string;
}
interface Manufacturer {
  id: string;
  name: string;
  active: boolean;
}

const EMPTY = {
  name: '',
  personName: '',
  gstin: '',
  mobile: '',
  alternateMobile: '',
  tehsilId: '',
  village: '',
  address: '',
  tradePosition: 'RETAILER',
  traderFlag: false,
  deliveryLocation: '',
};

/** Our field names → the reference form's, so a server message shows under the right box. */
const FIELD_OF: Record<string, string> = {
  firmName: 'name',
  contactName: 'personName',
  mobiles: 'mobile',
};

/** Sales → Register buyer, as the reference (app/(sales)/buyers/new). */
export function NewBuyerPage() {
  useDocumentTitle('Register buyer');
  const navigate = useNavigate();
  const [tehsils, setTehsils] = useState<Tehsil[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useOnMount(async () => {
    const [t, m] = await Promise.all([
      refGet<{ tehsils: Tehsil[] }>('/tehsils', { pageSize: 100 }),
      refGet<{ manufacturers: Manufacturer[] }>('/manufacturers'),
    ]);
    setTehsils(t.tehsils ?? []);
    setManufacturers((m.manufacturers ?? []).filter((x) => x.active));
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleManufacturer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const derivedTier = form.traderFlag ? 'TRADER' : form.tradePosition;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/buyers', {
        firmName: form.name,
        contactName: form.personName,
        mobiles: [form.mobile, ...(form.alternateMobile ? [form.alternateMobile] : [])],
        gstin: form.gstin,
        tehsilId: form.tehsilId,
        ...(form.village ? { village: form.village } : {}),
        address: form.address,
        deliveryLocation: form.deliveryLocation,
        tradePosition: form.tradePosition,
        traderFlag: form.traderFlag,
        manufacturerIds: [...selected],
      });
      if (!res.ok) {
        const field = res.field ? (FIELD_OF[res.field] ?? res.field) : '_form';
        setFieldErrors({ [res.status === 409 ? 'mobile' : field]: res.message });
        return;
      }
      void navigate('/buyers');
    } finally {
      setLoading(false);
    }
  }

  const input = 'rounded border border-zinc-300 px-3 py-2 text-sm';

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Register buyer</h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <Field label="Firm name" error={fieldErrors.name}>
          <input
            aria-label="Firm name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            className={input}
          />
        </Field>
        <Field label="Person name" error={fieldErrors.personName}>
          <input
            aria-label="Person name"
            value={form.personName}
            onChange={(e) => set('personName', e.target.value)}
            required
            className={input}
          />
        </Field>
        <Field label="Mobile" error={fieldErrors.mobile}>
          <input
            aria-label="Mobile"
            value={form.mobile}
            onChange={(e) => set('mobile', e.target.value)}
            required
            maxLength={10}
            inputMode="numeric"
            className={input}
          />
        </Field>
        <Field label="Alternate mobile (optional)">
          <input
            aria-label="Alternate mobile (optional)"
            value={form.alternateMobile}
            onChange={(e) => set('alternateMobile', e.target.value)}
            maxLength={10}
            inputMode="numeric"
            className={input}
          />
        </Field>
        <Field label="GSTIN (optional for a B2C buyer)" error={fieldErrors.gstin}>
          <input
            aria-label="GSTIN (optional for a B2C buyer)"
            value={form.gstin}
            onChange={(e) => set('gstin', e.target.value.toUpperCase())}
            maxLength={15}
            className={`${input} uppercase`}
          />
        </Field>
        <Field label="Tehsil" error={fieldErrors.tehsilId}>
          <select
            aria-label="Tehsil"
            value={form.tehsilId}
            onChange={(e) => set('tehsilId', e.target.value)}
            required
            className={input}
          >
            <option value="">Select…</option>
            {tehsils.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.district}, {t.state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Village (optional, if inside the tehsil)">
          <input
            aria-label="Village"
            value={form.village}
            onChange={(e) => set('village', e.target.value)}
            className={input}
          />
        </Field>
        <Field label="Address" error={fieldErrors.address}>
          <textarea
            aria-label="Address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            required
            rows={2}
            className={input}
          />
        </Field>
        <Field label="Trade position">
          <select
            aria-label="Trade position"
            value={form.tradePosition}
            onChange={(e) => set('tradePosition', e.target.value)}
            className={input}
          >
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="DEALER">Dealer</option>
            <option value="RETAILER">Retailer</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.traderFlag}
            onChange={(e) => set('traderFlag', e.target.checked)}
          />
          Trader (overrides trade position for rate tier)
        </label>
        <p className="text-xs text-zinc-500">
          Rate tier (derived): <strong>{tierLabel(derivedTier)}</strong>
        </p>
        <Field label="Delivery location" error={fieldErrors.deliveryLocation}>
          <input
            aria-label="Delivery location"
            value={form.deliveryLocation}
            onChange={(e) => set('deliveryLocation', e.target.value)}
            required
            className={input}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-zinc-700">Dealership companies</label>
          <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3">
            {manufacturers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleManufacturer(m.id)}
                  className="h-5 w-5"
                />
                {m.name}
              </label>
            ))}
            {manufacturers.length === 0 && (
              <p className="text-sm text-zinc-400">No manufacturers set up yet.</p>
            )}
          </div>
        </div>

        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}

        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Register buyer
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
