import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { INDIAN_STATES } from '@/lib/refLabels';
import { refGet, refSend } from '@/lib/refApi';

interface Tehsil {
  id: string;
  state: string;
  district: string;
  name: string;
  pincodes: string[];
}

/** Masters → Tehsils, as the reference (app/(admin)/masters/tehsils): add a tehsil with its pincodes; add more later. */
export function TehsilsPage() {
  useDocumentTitle('Tehsils');
  const [tehsils, setTehsils] = useState<Tehsil[]>([]);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [name, setName] = useState('');
  const [pincodeInputs, setPincodeInputs] = useState<string[]>(['']);
  const [newPincode, setNewPincode] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pincodeErrors, setPincodeErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ tehsils: Tehsil[] }>('/tehsils', { pageSize: 100 });
    setTehsils(data.tehsils ?? []);
  }

  useOnMount(load);

  function updatePincodeInput(index: number, value: string) {
    setPincodeInputs((inputs) => inputs.map((p, i) => (i === index ? value : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const pincodes = pincodeInputs.map((p) => p.trim()).filter(Boolean);
      const res = await refSend('POST', '/tehsils', { state, district, name, pincodes });
      if (!res.ok) {
        setFieldErrors({ [res.field ?? '_form']: res.message });
        return;
      }
      setState('');
      setDistrict('');
      setName('');
      setPincodeInputs(['']);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function addPincode(tehsil: Tehsil) {
    const code = (newPincode[tehsil.id] ?? '').trim();
    if (!code) return;
    setPincodeErrors((errs) => ({ ...errs, [tehsil.id]: '' }));
    const res = await refSend('PATCH', `/tehsils/${tehsil.id}`, {
      pincodes: [...tehsil.pincodes, code],
    });
    if (!res.ok) {
      setPincodeErrors((errs) => ({ ...errs, [tehsil.id]: res.message }));
      return;
    }
    setNewPincode((p) => ({ ...p, [tehsil.id]: '' }));
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Tehsils</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="tehsil-state" className="text-sm text-zinc-700">
            State
          </label>
          <select
            id="tehsil-state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {fieldErrors.state && <p className="text-xs text-red-600">{fieldErrors.state}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tehsil-district" className="text-sm text-zinc-700">
            District
          </label>
          <input
            id="tehsil-district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {fieldErrors.district && <p className="text-xs text-red-600">{fieldErrors.district}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tehsil-name" className="text-sm text-zinc-700">
            Tehsil name
          </label>
          <input
            id="tehsil-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-700">Pincode(s)</label>
          {pincodeInputs.map((p, i) => (
            <input
              key={i}
              aria-label={`Pincode ${i + 1}`}
              value={p}
              onChange={(e) => updatePincodeInput(i, e.target.value)}
              placeholder="e.g. 452001"
              maxLength={6}
              required={i === 0}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          ))}
          <button
            type="button"
            onClick={() => setPincodeInputs((inputs) => [...inputs, ''])}
            className="self-start text-xs text-zinc-500 underline hover:text-zinc-900"
          >
            + add another pincode
          </button>
          {fieldErrors.pincodes && <p className="text-xs text-red-600">{fieldErrors.pincodes}</p>}
        </div>
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add tehsil
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {tehsils.map((t) => (
          <div key={t.id} className="rounded border border-zinc-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900">
                {t.name}{' '}
                <span className="font-normal text-zinc-500">
                  — {t.district}, {t.state}
                </span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {t.pincodes.map((p) => (
                <span key={p} className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  {p}
                </span>
              ))}
              <input
                aria-label={`Add pincode to ${t.name}`}
                value={newPincode[t.id] ?? ''}
                onChange={(e) => setNewPincode((n) => ({ ...n, [t.id]: e.target.value }))}
                placeholder="Add pincode"
                maxLength={6}
                className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => void addPincode(t)}
                className="text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                add
              </button>
            </div>
            {pincodeErrors[t.id] && (
              <p className="mt-1 text-xs text-red-600">{pincodeErrors[t.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
