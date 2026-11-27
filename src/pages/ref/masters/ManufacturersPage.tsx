import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface Manufacturer {
  id: string;
  name: string;
}

/** Masters → Manufacturers, as the reference (app/(admin)/masters/manufacturers). */
export function ManufacturersPage() {
  useDocumentTitle('Manufacturers');
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ manufacturers: Manufacturer[] }>('/manufacturers');
    setManufacturers(data.manufacturers ?? []);
  }

  useOnMount(load);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/manufacturers', { name });
      if (!res.ok) {
        setFieldErrors({ [res.field ?? '_form']: res.message });
        return;
      }
      setName('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Manufacturers</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="manufacturer-name" className="text-sm text-zinc-700">
            Name
          </label>
          <input
            id="manufacturer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add manufacturer
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-2">Name</th>
          </tr>
        </thead>
        <tbody>
          {manufacturers.map((m) => (
            <tr key={m.id} className="border-b border-zinc-100">
              <td className="py-2">{m.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
