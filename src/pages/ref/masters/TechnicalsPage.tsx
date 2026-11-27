import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface Technical {
  id: string;
  name: string;
  description: string | null;
}

/** Masters → Technicals, as the reference (app/(admin)/masters/technicals). */
export function TechnicalsPage() {
  useDocumentTitle('Technicals');
  const [technicals, setTechnicals] = useState<Technical[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ technicals: Technical[] }>('/technicals');
    setTechnicals(data.technicals ?? []);
  }

  useOnMount(load);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await refSend('POST', '/technicals', {
        name,
        ...(description ? { description } : {}),
      });
      if (!res.ok) {
        setFieldErrors({ [res.field ?? '_form']: res.message });
        return;
      }
      setName('');
      setDescription('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Technicals</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="technical-name" className="text-sm text-zinc-700">
            Name
          </label>
          <input
            id="technical-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="technical-description" className="text-sm text-zinc-700">
            Description (optional)
          </label>
          <input
            id="technical-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Azadirachtin 0.03% EC"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add technical
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-2">Name</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {technicals.map((t) => (
            <tr key={t.id} className="border-b border-zinc-100">
              <td className="py-2">{t.name}</td>
              <td className="py-2 text-zinc-500">{t.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
