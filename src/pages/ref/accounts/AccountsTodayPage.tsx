import { useState } from 'react';
import { Link } from 'react-router';
import { editValue, KIND_LABEL, type CreditEditRow } from '@/components/ref/credit/CreditEditPanel';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';

/**
 * Accounts → Today, as the reference (app/(accounts)/accounts-today): credit edits waiting for a second check
 * (maker ≠ checker). Our API: GET /credit/edits?status=PENDING, POST /credit/edits/:id/check { apply }.
 */
export function AccountsTodayPage() {
  useDocumentTitle('Today');
  const [edits, setEdits] = useState<CreditEditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await refGet<{ edits: CreditEditRow[] }>('/credit/edits', { status: 'PENDING' });
    setEdits(res.edits ?? []);
  }
  useOnMount(load);

  async function check(id: string, apply: boolean) {
    setError(null);
    const res = await refSend('POST', `/credit/edits/${id}/check`, { apply });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Today</h1>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Credit edits — waiting for a second check
      </h2>
      <div className="flex flex-col gap-2">
        {edits.map((e) => (
          <div
            key={e.id}
            className="rounded border border-amber-200 bg-amber-50 p-3 text-sm"
            data-testid="pending-edit"
          >
            <div className="flex items-center justify-between">
              <Link to="/ledger" className="font-medium text-zinc-900">
                {e.party.name}
              </Link>
              <span className="text-xs text-zinc-500">{formatDateIST(e.createdAt, true)}</span>
            </div>
            <p className="mt-1">
              <strong>{KIND_LABEL[e.kind]}</strong>: {editValue(e.kind, e.oldValue)} →{' '}
              {editValue(e.kind, e.newValue)}
            </p>
            <p className="text-xs text-zinc-600">
              Reason: {e.reason} · by {e.madeByMe ? 'you' : e.madeBy}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void check(e.id, true)}
                className="min-h-11 rounded border border-zinc-300 bg-white px-3 text-xs"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => void check(e.id, false)}
                className="min-h-11 rounded border border-zinc-300 bg-white px-3 text-xs"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {edits.length === 0 && <p className="text-sm text-zinc-400">Nothing waiting.</p>}
      </div>
    </div>
  );
}
