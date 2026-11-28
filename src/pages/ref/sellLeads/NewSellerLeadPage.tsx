import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { existingLeadIdOf } from '@/components/ref/sellLeads/PushToPurchaseButton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

interface FirmOption {
  id: string;
  name: string;
  mobile: string;
  tehsilName: string;
}

/**
 * Purchase → Add seller lead, as the reference (app/(purchase)/seller-leads/new): Purchase's own entry, no Sales
 * step. The firm picker shows only name, mobile and tehsil (GET /sell-leads/firms).
 */
export function NewSellerLeadPage() {
  useDocumentTitle('Add seller lead');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FirmOption[]>([]);
  const [firmId, setFirmId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [existingLeadId, setExistingLeadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(q: string) {
    setQuery(q);
    setFirmId(undefined);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const data = await refGet<{ buyers: FirmOption[] }>('/sell-leads/firms', { q });
    setOptions(data.buyers ?? []);
  }

  async function submit() {
    if (!firmId || !note.trim()) return;
    setBusy(true);
    setError(null);
    setExistingLeadId(null);
    try {
      const res = await refSend<{ sellLead: { id: string } }>('POST', '/sell-leads', {
        firmId,
        note: note.trim(),
      });
      if (!res.ok) {
        setError(res.message);
        setExistingLeadId(existingLeadIdOf(res.details));
        return;
      }
      void navigate(`/seller-leads/${res.data.sellLead.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Add seller lead</h1>
      {error && (
        <p className="mb-3 text-sm text-red-600">
          {error}
          {existingLeadId && (
            <>
              {' — '}
              <Link to={`/seller-leads/${existingLeadId}`} className="underline">
                view the open lead
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Firm
          <input
            value={query}
            onChange={(e) => void search(e.target.value)}
            placeholder="Search by name or mobile…"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {options.length > 0 && !firmId && (
            <div className="rounded border border-zinc-200 text-sm">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setFirmId(o.id);
                    setQuery(o.name);
                    setOptions([]);
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                >
                  {o.name} — {o.mobile} ({o.tehsilName})
                </button>
              ))}
            </div>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={busy || !firmId || !note.trim()}
          onClick={() => void submit()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Add lead
        </button>
      </div>
    </div>
  );
}
