import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface VehicleOwner {
  id: string;
  name: string;
  mobile: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: string | null;
  homeArea: { name: string; district: string; state: string } | null;
}
interface Tehsil {
  id: string;
  name: string;
  district: string;
  state: string;
}

const input = 'min-h-11 rounded border border-zinc-300 px-3 py-2 text-base sm:text-sm';

/** Logistics → Vehicle owners, as the reference (app/(logistics)/vehicle-owners). A Logistics Head adds them. */
export function VehicleOwnersPage() {
  useDocumentTitle('Vehicle owners');
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [tehsils, setTehsils] = useState<Tehsil[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    vehicleNumber: '',
    vehicleType: '',
    capacity: '',
    homeAreaId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ vehicleOwners: VehicleOwner[]; canCreate: boolean }>(
      '/vehicle-owners',
    );
    setOwners(data.vehicleOwners ?? []);
    setCanCreate(Boolean(data.canCreate));
  }

  useOnMount(async () => {
    await load();
    setTehsils((await refGet<{ tehsils: Tehsil[] }>('/tehsils', { pageSize: 100 })).tehsils ?? []);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/vehicle-owners', {
        ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')),
      });
      if (!res.ok) {
        setFieldErrors({ [res.field ?? '_form']: res.message });
        return;
      }
      setForm({
        name: '',
        mobile: '',
        vehicleNumber: '',
        vehicleType: '',
        capacity: '',
        homeAreaId: '',
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? owners.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.mobile.includes(q) ||
          v.vehicleNumber.toLowerCase().includes(q) ||
          v.vehicleType.toLowerCase().includes(q) ||
          (v.homeArea &&
            `${v.homeArea.name} ${v.homeArea.district} ${v.homeArea.state}`
              .toLowerCase()
              .includes(q)),
      )
    : owners;

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Vehicle owners</h1>
      <p className="mb-4 text-xs text-zinc-400">
        Not staff — no login. Pickup/drop instructions are sent outside the system (WhatsApp, phone
        call).
      </p>

      {canCreate ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
        >
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Name
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Mobile
            <input
              type="tel"
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              required
              className={input}
            />
            {fieldErrors.mobile && <p className="text-xs text-red-600">{fieldErrors.mobile}</p>}
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Vehicle number
            <input
              value={form.vehicleNumber}
              onChange={(e) => set('vehicleNumber', e.target.value)}
              required
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Vehicle type
            <input
              value={form.vehicleType}
              onChange={(e) => set('vehicleType', e.target.value)}
              required
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Capacity (optional)
            <input
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Home area (optional)
            <select
              value={form.homeAreaId}
              onChange={(e) => set('homeAreaId', e.target.value)}
              className={input}
            >
              <option value="">None</option>
              {tehsils.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.district}, {t.state}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            Add vehicle owner
          </button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-zinc-500">Only a Logistics Head can add a vehicle owner.</p>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, mobile, vehicle number, or home area…"
        className={`mb-3 w-full ${input}`}
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-2">Name</th>
            <th className="py-2">Mobile</th>
            <th className="py-2">Vehicle</th>
            <th className="py-2">Home area</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-zinc-400">
                Nothing found.
              </td>
            </tr>
          )}
          {filtered.map((v) => (
            <tr key={v.id} className="border-b border-zinc-100">
              <td className="py-2">{v.name}</td>
              <td className="py-2">{v.mobile}</td>
              <td className="py-2">
                {v.vehicleNumber} ({v.vehicleType}
                {v.capacity ? `, ${v.capacity}` : ''})
              </td>
              <td className="py-2">
                {v.homeArea
                  ? `${v.homeArea.name} — ${v.homeArea.district}, ${v.homeArea.state}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
