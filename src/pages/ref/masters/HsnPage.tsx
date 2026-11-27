import { useState } from 'react';
import { NumberInput } from '@/components/ref/NumberInput';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface HsnCode {
  id: string;
  code: string;
  description: string | null;
  gstBp: number;
}

/** Masters → HSN codes, as the reference (app/(admin)/masters/hsn). GST is typed in %, kept in basis points. */
export function HsnPage() {
  useDocumentTitle('HSN codes');
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [gstPct, setGstPct] = useState<number | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await refGet<{ hsnCodes: HsnCode[] }>('/hsn-codes');
    setHsnCodes(data.hsnCodes ?? []);
  }

  useOnMount(load);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (gstPct === undefined) {
      setFieldErrors({ _form: 'Enter a GST %.' });
      return;
    }
    setLoading(true);
    try {
      const res = await refSend('POST', '/hsn-codes', {
        code,
        ...(description ? { description } : {}),
        gstBp: Math.round(gstPct * 100),
      });
      if (!res.ok) {
        setFieldErrors({
          [res.field === 'gstBp' ? 'gstPct' : (res.field ?? '_form')]: res.message,
        });
        return;
      }
      setCode('');
      setDescription('');
      setGstPct(undefined);
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">HSN codes</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="hsn-code" className="text-sm text-zinc-700">
            HSN code
          </label>
          <input
            id="hsn-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={8}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {fieldErrors.code && <p className="text-xs text-red-600">{fieldErrors.code}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="hsn-description" className="text-sm text-zinc-700">
            Description (optional)
          </label>
          <input
            id="hsn-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-700">GST %</label>
          <NumberInput
            ariaLabel="GST %"
            value={gstPct}
            onChange={setGstPct}
            min={0}
            step={0.01}
            required
          />
          {fieldErrors.gstPct && <p className="text-xs text-red-600">{fieldErrors.gstPct}</p>}
        </div>
        {fieldErrors._form && <p className="text-xs text-red-600">{fieldErrors._form}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add HSN code
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-2">Code</th>
            <th className="py-2">Description</th>
            <th className="py-2">GST %</th>
          </tr>
        </thead>
        <tbody>
          {hsnCodes.map((h) => (
            <tr key={h.id} className="border-b border-zinc-100">
              <td className="py-2">{h.code}</td>
              <td className="py-2 text-zinc-500">{h.description ?? '—'}</td>
              <td className="py-2">{h.gstBp / 100}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
