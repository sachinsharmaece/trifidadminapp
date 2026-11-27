import { useState } from 'react';
import { refSend } from '@/lib/refApi';
import { rupeesToPaise } from '@/lib/refMoney';

interface CheckRow {
  label: string;
  detail: string;
  result: 'ok' | 'ctl' | 'blk';
}
interface CheckResult {
  checks: CheckRow[];
  warnings: string[];
  blocked: boolean;
  route: 'TM' | 'CONTROLLER';
  cheque: boolean;
}

const RESULT_PILL: Record<CheckRow['result'], string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  ctl: 'bg-amber-100 text-amber-700',
  blk: 'bg-red-100 text-red-700',
};
const RESULT_LABEL: Record<CheckRow['result'], string> = {
  ok: 'OK',
  ctl: 'Controller',
  blk: 'Stop',
};

/**
 * "Request limit", copied from the reference (components/credit/RequestLimitForm.tsx). The requester sees every
 * check (POST /credit/requests/check, a dry run) before Send; Send (POST /credit/requests) is refused on a Stop.
 */
export function RequestLimitForm({ buyerId, onSent }: { buyerId: string; onSent?: () => void }) {
  const [open, setOpen] = useState(false);
  const [toLimit, setToLimit] = useState('');
  const [days, setDays] = useState<7 | 15>(7);
  const [referenceMobile, setReferenceMobile] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function runCheck(nextDays = days) {
    setError(null);
    if (!(Number(toLimit) > 0) || referenceMobile.trim().length < 10) {
      setResult(null);
      return;
    }
    setChecking(true);
    const res = await refSend<{ result: CheckResult }>('POST', '/credit/requests/check', {
      buyerId,
      toLimitPaise: rupeesToPaise(Number(toLimit)),
      days: nextDays,
      referenceMobile: referenceMobile.trim(),
    });
    setChecking(false);
    if (!res.ok) {
      setError(res.message);
      setResult(null);
      return;
    }
    setResult(res.data.result);
  }

  async function send() {
    setError(null);
    setSent(null);
    if (!result || result.blocked || !referenceName.trim()) {
      setError(
        !referenceName.trim() ? 'Reference name is required' : 'Fix the item marked Stop first',
      );
      return;
    }
    const res = await refSend<{ request: { number: string; route: 'TM' | 'CONTROLLER' } }>(
      'POST',
      '/credit/requests',
      {
        buyerId,
        toLimitPaise: rupeesToPaise(Number(toLimit)),
        days,
        referenceMobile: referenceMobile.trim(),
        referenceName: referenceName.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
    );
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSent(
      `${res.data.request.number} sent — goes to ${res.data.request.route === 'TM' ? 'TM' : 'Controller'}`,
    );
    setToLimit('');
    setReferenceMobile('');
    setReferenceName('');
    setNote('');
    setResult(null);
    onSent?.();
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
        >
          Request limit
        </button>
        {sent && <p className="mt-2 text-xs text-emerald-700">{sent}</p>}
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">
          Request a credit limit
          {/* Shown in the title row, so the form does not jump when a check runs on blur. */}
          {checking && <span className="ml-2 text-xs font-normal text-zinc-400">Checking…</span>}
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400">
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-600">
          New total limit (₹)
          <input
            type="number"
            value={toLimit}
            onChange={(e) => setToLimit(e.target.value)}
            onBlur={() => void runCheck()}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-zinc-600">
          Days
          <select
            value={days}
            onChange={(e) => {
              const next = Number(e.target.value) as 7 | 15;
              setDays(next);
              void runCheck(next);
            }}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value={7}>7</option>
            <option value={15}>15</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Reference mobile
          <input
            value={referenceMobile}
            onChange={(e) => setReferenceMobile(e.target.value)}
            onBlur={() => void runCheck()}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-zinc-600">
          Reference name
          <input
            value={referenceName}
            onChange={(e) => setReferenceName(e.target.value)}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="col-span-2 text-xs text-zinc-600">
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-11 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      {result && (
        <>
          <div
            data-testid="credit-route"
            className={`mt-3 rounded border-2 p-2 text-sm font-semibold ${
              result.blocked
                ? 'border-red-600 bg-red-50 text-red-700'
                : result.route === 'CONTROLLER'
                  ? 'border-amber-600 bg-amber-50 text-amber-700'
                  : 'border-emerald-600 bg-emerald-50 text-emerald-700'
            }`}
          >
            {result.blocked
              ? 'Cannot be sent'
              : result.route === 'CONTROLLER'
                ? 'Goes to Controller'
                : 'Goes to TM'}
          </div>
          <div className="mt-2 overflow-x-auto rounded border border-zinc-200">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-400">
                <tr>
                  <th className="px-2 py-1 text-left">Check</th>
                  <th className="px-2 py-1 text-left">Detail</th>
                  <th className="px-2 py-1 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.checks.map((c, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="px-2 py-1 font-medium">{c.label}</td>
                    <td className="px-2 py-1 text-zinc-600">{c.detail}</td>
                    <td className="px-2 py-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESULT_PILL[c.result]}`}
                      >
                        {RESULT_LABEL[c.result]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-700">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {result.cheque && (
            <p className="mt-2 text-xs text-zinc-500">
              Security cheque / agreement photo field available (optional).
            </p>
          )}
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {sent && <p className="mt-2 text-xs text-emerald-700">{sent}</p>}
      <button
        type="button"
        onClick={() => void send()}
        disabled={!result || result.blocked || !referenceName.trim()}
        className="mt-3 min-h-11 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
