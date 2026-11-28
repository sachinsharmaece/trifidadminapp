import { useState } from 'react';
import { Link } from 'react-router';
import { refSend } from '@/lib/refApi';

/** The id of the open lead the server names when this firm already has one. */
export function existingLeadIdOf(details: unknown): string | null {
  if (!details || typeof details !== 'object' || !('existingLeadId' in details)) return null;
  return String(details.existingLeadId);
}

/**
 * "Push to purchase", copied from the reference (components/sellLeads/PushToPurchaseButton.tsx): on the Sales call
 * screen and the buyer page. The firm comes from the buyer record, never typed. Our API: POST /sell-leads.
 */
export function PushToPurchaseButton({
  firmId,
  firmName,
  onPushed,
}: {
  firmId: string;
  firmName: string;
  onPushed?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [existingLeadId, setExistingLeadId] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    setExistingLeadId(null);
    try {
      const res = await refSend('POST', '/sell-leads', { firmId, note: note.trim() });
      if (!res.ok) {
        setError(res.message);
        setExistingLeadId(existingLeadIdOf(res.details));
        return;
      }
      setPushed(true);
      setOpen(false);
      onPushed?.();
    } finally {
      setBusy(false);
    }
  }

  if (pushed) return <span className="text-xs text-green-700">Pushed to purchase.</span>;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
      >
        Push to purchase
      </button>
    );
  }
  return (
    <div className="rounded border border-zinc-300 p-3 text-sm">
      <p className="mb-2 font-medium text-zinc-700">Push {firmName} to purchase</p>
      {error && (
        <p className="mb-2 text-xs text-red-600">
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
      <div className="flex flex-col gap-2">
        <textarea
          placeholder="Note"
          aria-label="Push note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-2 text-sm"
          rows={3}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={() => void submit()}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            Push
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
