import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';
import { formatDateIST, formatPaiseAsINR } from '@/lib/refMoney';

interface SellLead {
  id: string;
  firm: {
    name: string;
    personName: string;
    mobile: string;
    alternateMobile: string | null;
    gstin: string;
    tehsil: { name: string; district: string; state: string };
    tradePosition: string;
    dealerships: string[];
  };
  productText: string;
  approxQty: number | null;
  qtyUnit: string | null;
  expectedRatePaisePerUnit: number | null;
  note: string | null;
  status: string;
  owner: string | null;
  rejectCode: string | null;
  rejectNote: string | null;
  createdAt: string;
  dueAt: string;
  pastSla: boolean;
}
interface ReasonCode {
  code: string;
  label: string;
  context: string;
  active: boolean;
}

const CLOSED_STATUSES = ['ONBOARDED', 'REJECTED', 'ALREADY_SELLER'];

/**
 * One seller lead, as the reference (app/(purchase)/seller-leads/[id]): the firm, what he offers, the SLA, and the
 * actions — Claim, Accept, Start seller onboarding, Already a seller, Reject (a reason; Other needs a note), Log
 * contact.
 */
export function SellerLeadDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<SellLead | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rejectCodes, setRejectCodes] = useState<ReasonCode[]>([]);
  const [showReject, setShowReject] = useState(false);
  const [rejectCode, setRejectCode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(lead ? `${lead.firm.name} — lead` : 'Seller lead');

  async function load() {
    try {
      setLead((await refGet<{ sellLead: SellLead }>(`/sell-leads/${id}`)).sellLead);
    } catch {
      setNotFound(true);
    }
  }
  useOnMount(async () => {
    await load();
    const data = await refGet<{ reasonCodes: ReasonCode[] }>('/reason-codes', {
      context: 'SELL_LEAD_REJECT',
    });
    setRejectCodes(
      (data.reasonCodes ?? []).filter(
        (c) => c.context === 'SELL_LEAD_REJECT' && c.active !== false,
      ),
    );
  });

  async function act(action: string, body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await refSend('POST', `/sell-leads/${id}/${action}`, body ?? {});
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await load();
      setShowReject(false);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) return <div className="p-8 text-sm text-zinc-500">Seller lead not found.</div>;
  if (!lead) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;
  const closed = CLOSED_STATUSES.includes(lead.status);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">
          {lead.firm.name} — {lead.productText}
        </h1>
        <div className="flex items-center gap-2">
          {lead.pastSla && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Past SLA</span>
          )}
          <span
            className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
            data-testid="lead-status"
          >
            {lead.status}
          </span>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <dl className="mb-6 grid grid-cols-[160px_1fr] gap-y-2 rounded border border-zinc-200 p-4 text-sm">
        <dt className="text-zinc-500">Contact person</dt>
        <dd>{lead.firm.personName}</dd>
        <dt className="text-zinc-500">Mobile</dt>
        <dd>
          {lead.firm.mobile}
          {lead.firm.alternateMobile && (
            <span className="ml-2 text-zinc-500">alt: {lead.firm.alternateMobile}</span>
          )}
        </dd>
        <dt className="text-zinc-500">GSTIN</dt>
        <dd>{lead.firm.gstin || '—'}</dd>
        <dt className="text-zinc-500">Tehsil</dt>
        <dd>
          {lead.firm.tehsil.name} — {lead.firm.tehsil.district}, {lead.firm.tehsil.state}
        </dd>
        <dt className="text-zinc-500">Trade position</dt>
        <dd>{lead.firm.tradePosition}</dd>
        <dt className="text-zinc-500">Dealerships</dt>
        <dd>{lead.firm.dealerships.length > 0 ? lead.firm.dealerships.join(', ') : '—'}</dd>
        <dt className="text-zinc-500">Offered</dt>
        <dd>
          {lead.productText}
          {lead.approxQty && ` — approx ${lead.approxQty} ${lead.qtyUnit ?? ''}`}
        </dd>
        <dt className="text-zinc-500">Expected rate</dt>
        <dd>
          {lead.expectedRatePaisePerUnit !== null
            ? `${formatPaiseAsINR(lead.expectedRatePaisePerUnit)} per unit`
            : 'Not given'}
        </dd>
        <dt className="text-zinc-500">Note</dt>
        <dd>{lead.note ?? '—'}</dd>
        <dt className="text-zinc-500">Owner</dt>
        <dd>{lead.owner ?? 'Unclaimed'}</dd>
        <dt className="text-zinc-500">Pushed</dt>
        <dd>{formatDateIST(lead.createdAt, true)}</dd>
        <dt className="text-zinc-500">Due</dt>
        <dd>{formatDateIST(lead.dueAt, true)}</dd>
        {lead.rejectCode && (
          <>
            <dt className="text-zinc-500">Reject reason</dt>
            <dd>
              {lead.rejectCode}
              {lead.rejectNote && ` — ${lead.rejectNote}`}
            </dd>
          </>
        )}
      </dl>

      {!closed && (
        <div className="flex flex-col gap-3 rounded border border-zinc-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void act('claim')}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              Claim
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act('accept')}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void navigate(`/sellers/new?sellLeadId=${lead.id}`)}
              className="rounded bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              Start seller onboarding
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act('already-seller')}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              Already a seller
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowReject((v) => !v)}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
            >
              Reject
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              placeholder="Contact note (optional)"
              className="flex-1 rounded border border-zinc-300 px-2 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void act('contact', contactNote ? { note: contactNote } : {})}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              Log contact
            </button>
          </div>
          {showReject && (
            <div className="flex flex-col gap-2 rounded border border-red-200 p-3">
              <select
                aria-label="Reject reason"
                value={rejectCode}
                onChange={(e) => setRejectCode(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-2 text-sm"
              >
                <option value="">Select a reason…</option>
                {rejectCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              {rejectCode === 'OTHER' && (
                <input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Note (required for Other)"
                  className="rounded border border-zinc-300 px-2 py-2 text-sm"
                />
              )}
              <button
                type="button"
                disabled={busy || !rejectCode}
                onClick={() =>
                  void act('reject', {
                    code: rejectCode,
                    ...(rejectNote ? { note: rejectNote } : {}),
                  })
                }
                className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                Confirm reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
