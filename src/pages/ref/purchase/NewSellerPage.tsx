import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface Tehsil {
  id: string;
  name: string;
  district: string;
  state: string;
}

const EMPTY = {
  name: '',
  gstin: '',
  mobile: '',
  bankAccountNumber: '',
  ifsc: '',
  tehsilId: '',
  dispatchCutoffTime: '',
};

/** Our field names → the reference form's, so a server message shows under the right box. */
const FIELD_OF: Record<string, string> = {
  firmName: 'name',
  dispatchCutoff: 'dispatchCutoffTime',
  bank: 'ifsc',
};

/** Purchase → Register seller, as the reference (app/(purchase)/sellers/new). */
export function NewSellerPage() {
  useDocumentTitle('Register seller');
  const navigate = useNavigate();
  const [tehsils, setTehsils] = useState<Tehsil[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useOnMount(async () => {
    const data = await refGet<{ tehsils: Tehsil[] }>('/tehsils', { pageSize: 100 });
    setTehsils(data.tehsils ?? []);
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/sellers', {
        firmName: form.name,
        gstin: form.gstin,
        mobile: form.mobile,
        tehsilId: form.tehsilId,
        dispatchCutoff: form.dispatchCutoffTime,
        bank: { accountNumber: form.bankAccountNumber, ifsc: form.ifsc },
      });
      if (!res.ok) {
        const field = res.field ? (FIELD_OF[res.field] ?? res.field) : '_form';
        // A duplicate (409) names what clashed in its message; show it under GSTIN like the reference.
        setFieldErrors({ [res.status === 409 ? 'gstin' : field]: res.message });
        return;
      }
      void navigate('/sellers');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Register seller</h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <Field label="Name" error={fieldErrors.name}>
          <input
            aria-label="Name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="GSTIN" error={fieldErrors.gstin}>
          <input
            aria-label="GSTIN"
            value={form.gstin}
            onChange={(e) => set('gstin', e.target.value.toUpperCase())}
            required
            maxLength={15}
            className="rounded border border-zinc-300 px-3 py-2 text-sm uppercase"
          />
        </Field>
        <Field label="Mobile" error={fieldErrors.mobile}>
          <input
            aria-label="Mobile"
            value={form.mobile}
            onChange={(e) => set('mobile', e.target.value)}
            required
            maxLength={10}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Bank account number" error={fieldErrors.accountNumber}>
          <input
            aria-label="Bank account number"
            value={form.bankAccountNumber}
            onChange={(e) => set('bankAccountNumber', e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="IFSC" error={fieldErrors.ifsc}>
          <input
            aria-label="IFSC"
            value={form.ifsc}
            onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm uppercase"
          />
        </Field>
        <Field label="Area (tehsil)" error={fieldErrors.tehsilId}>
          <select
            aria-label="Area (tehsil)"
            value={form.tehsilId}
            onChange={(e) => set('tehsilId', e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {tehsils.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.district}, {t.state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dispatch cut-off (HH:mm)" error={fieldErrors.dispatchCutoffTime}>
          <input
            aria-label="Dispatch cut-off (HH:mm)"
            type="time"
            value={form.dispatchCutoffTime}
            onChange={(e) => set('dispatchCutoffTime', e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>

        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}

        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Register seller
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
