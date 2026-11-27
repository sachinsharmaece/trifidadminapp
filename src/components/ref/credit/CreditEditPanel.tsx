import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/hooks';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';
import { uploadFile } from '../FileField';

export type CreditEditKind = 'REDUCE' | 'SUSPEND' | 'RESUME' | 'DAYS' | 'CHEQUE';
export interface CreditEditRow {
  id: string;
  party: { id: string; name: string };
  kind: CreditEditKind;
  oldValue: string;
  newValue: string;
  reason: string;
  madeBy: string;
  madeByMe: boolean;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  createdAt: string;
}

export const KIND_LABEL: Record<CreditEditKind, string> = {
  REDUCE: 'Reduce limit',
  SUSPEND: 'Suspend',
  RESUME: 'Resume',
  DAYS: 'Change days (7 / 15)',
  CHEQUE: 'Upload cheque / agreement',
};

/** An edit's old and new value as people read them (a reduced limit is stored in paise). */
export function editValue(kind: CreditEditKind, value: string) {
  if (!value) return '—';
  if (kind === 'REDUCE') return formatPaiseAsINR(Number(value));
  if (kind === 'CHEQUE') return 'photo';
  return value;
}

/**
 * The credit panel on the Accounts statement, copied from the reference (components/credit/CreditEditPanel.tsx):
 * the only place a credit line is edited. Reduce / Suspend / Resume (manual only) / Days / Cheque, each with a
 * reason; a second person checks it (maker ≠ checker, enforced by the server). An increase is never done here.
 */
export function CreditEditPanel({
  buyerId,
  onChanged,
}: {
  buyerId: string;
  onChanged?: () => void;
}) {
  const { data: me } = useCurrentUser();
  const canEdit = ['ADMIN', 'ACCOUNTS', 'CONTROLLER', 'FOUNDER'].includes(me?.role ?? '');
  const [kind, setKind] = useState<CreditEditKind>('REDUCE');
  const [newValue, setNewValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CreditEditRow[]>([]);

  async function load() {
    const res = await refGet<{ edits: CreditEditRow[] }>('/credit/edits', {
      buyerId,
      status: 'PENDING',
    });
    setPending(res.edits ?? []);
  }
  useOnMount(load);

  const needsValue = kind === 'REDUCE' || kind === 'DAYS';

  async function propose() {
    setError(null);
    if ((needsValue && !newValue.trim()) || (kind === 'CHEQUE' && !file) || !reason.trim()) {
      setError('New value and reason are both required');
      return;
    }
    setBusy(true);
    try {
      const value = kind === 'CHEQUE' && file ? await uploadFile(file) : newValue.trim();
      const res = await refSend('POST', '/credit/edits', {
        buyerId,
        kind,
        newValue: value,
        reason: reason.trim(),
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNewValue('');
      setFile(null);
      setReason('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function check(id: string, apply: boolean) {
    setError(null);
    const res = await refSend('POST', `/credit/edits/${id}/check`, { apply });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
    onChanged?.();
  }

  if (!canEdit) return null;
  return (
    <div className="rounded border border-zinc-200 bg-white p-3" data-testid="credit-edit-panel">
      <p className="mb-2 text-sm font-medium text-zinc-900">Credit (only edit place)</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-600">
          Action
          <select
            aria-label="Credit action"
            value={kind}
            onChange={(e) => setKind(e.target.value as CreditEditKind)}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          New value
          {kind === 'CHEQUE' ? (
            <input
              type="file"
              accept="image/*,application/pdf"
              aria-label="Cheque or agreement"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="min-h-11 w-full text-sm"
            />
          ) : (
            <input
              aria-label="New value"
              value={newValue}
              disabled={!needsValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={kind === 'DAYS' ? '7 or 15' : needsValue ? '₹' : '—'}
              className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-50"
            />
          )}
        </label>
        <label className="col-span-2 text-xs text-zinc-600">
          Reason (required)
          <input
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Increase is never done here — only through a request. Edits need a second Accounts person to
        check.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void propose()}
        disabled={busy}
        className="mt-2 min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Propose edit
      </button>
      {pending.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Pending a second check
          </p>
          {pending.map((e) => (
            <div key={e.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
              <p>
                <strong>{KIND_LABEL[e.kind]}</strong>: {editValue(e.kind, e.oldValue)} →{' '}
                {editValue(e.kind, e.newValue)}
              </p>
              <p className="text-zinc-600">Reason: {e.reason}</p>
              <p className="mt-1 text-zinc-400">
                {e.madeByMe
                  ? 'Proposed by you: a different Accounts person must check it.'
                  : `Proposed by ${e.madeBy}.`}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => void check(e.id, true)}
                  className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => void check(e.id, false)}
                  className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
