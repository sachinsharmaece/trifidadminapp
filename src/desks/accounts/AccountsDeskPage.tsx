import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import {
  allocateUpcomingReceipt,
  buildPaymentRun,
  getBuyerLedger,
  getPoPayable,
  getSellerLedger,
  getUpcomingReceipts,
  postBankCredit,
  releasePaymentRun,
  repostBankEntry,
  runDayClose,
} from '../../api/payment';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { ReauthPrompt } from '../../components/ReauthPrompt';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import type { UpcomingReceiptListItem } from '../../api/dto';

/**
 * BR-070 — Accounts is inside the wall: it books both legs of every trade's
 * money and sees a counterparty's own side, never both on one record, and
 * has no power to set or alter a rate. This one desk covers the whole
 * money spine: the receipt flow (WF-06), payables and payment runs
 * (BR-016's maker–checker), reverse-and-repost (BR-015), day close
 * (BR-308), and the two ledgers (BR-014).
 */
export function AccountsDeskPage() {
  return (
    <main>
      <h1>Accounts</h1>
      <UpcomingReceiptsSection />
      <PostBankCreditSection />
      <PayablesSection />
      <PaymentRunSection />
      <RepostSection />
      <DayCloseSection />
      <LedgersSection />
    </main>
  );
}

function UpcomingReceiptsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getUpcomingReceipts(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <section>
      <h2>Upcoming receipts</h2>
      <p className="note">
        BR-011/INV-15 — a buyer's claim. Not money yet — it touches no bank book and no ledger until
        it is allocated and posted below.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items: UpcomingReceiptListItem[]) => (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Claimed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.upcomingReceiptId}>
                  <td>{item.upcomingReceiptId}</td>
                  <td>{item.buyerId}</td>
                  <td>₹{(item.amountPaise / 100).toFixed(2)}</td>
                  <td>{new Date(item.claimedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
      <AllocateForm onDone={retry} />
    </section>
  );
}

function AllocateForm({ onDone }: { onDone: () => void }) {
  const { callApi } = useAuth();
  const [receiptId, setReceiptId] = useState('');
  const [soIdsText, setSoIdsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const soIds = soIdsText
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      await callApi((token) => allocateUpcomingReceipt(token, receiptId, soIds));
      setReceiptId('');
      setSoIdsText('');
      onDone();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not allocate.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Allocate — BR-012, Sales knows which order he meant</h3>
      <label htmlFor="al-receipt">Upcoming receipt ID</label>
      <input
        id="al-receipt"
        value={receiptId}
        onChange={(e) => setReceiptId(e.target.value)}
        required
      />
      <label htmlFor="al-sos">SO IDs (comma-separated)</label>
      <input
        id="al-sos"
        value={soIdsText}
        onChange={(e) => setSoIdsText(e.target.value)}
        required
      />
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        Allocate
      </button>
    </form>
  );
}

function PostBankCreditSection() {
  const { callApi } = useAuth();
  const [receiptId, setReceiptId] = useState('');
  const [utr, setUtr] = useState('');
  const [remitterAccountNumber, setRemitterAccountNumber] = useState('');
  const [remitterIfsc, setRemitterIfsc] = useState('');
  const [result, setResult] = useState<{ bankbookId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          postBankCredit(token, receiptId, { utr, remitterAccountNumber, remitterIfsc }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not post this credit.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Post a bank credit</h2>
      <p className="note">
        BR-027 — only Accounts may mark a payment verified, and every mark carries a UTR and a
        person. Matched against the bank statement by hand at the 13:00/16:00/19:00 run.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="pb-receipt">Upcoming receipt ID (must be allocated first)</label>
        <input
          id="pb-receipt"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          required
        />
        <label htmlFor="pb-utr">Statement UTR</label>
        <input id="pb-utr" value={utr} onChange={(e) => setUtr(e.target.value)} required />
        <label htmlFor="pb-account">Remitter account number</label>
        <input
          id="pb-account"
          value={remitterAccountNumber}
          onChange={(e) => setRemitterAccountNumber(e.target.value)}
          required
        />
        <label htmlFor="pb-ifsc">Remitter IFSC</label>
        <input
          id="pb-ifsc"
          value={remitterIfsc}
          onChange={(e) => setRemitterIfsc(e.target.value)}
          required
        />
        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && <p className="note">Posted as {result.bankbookId}.</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post credit'}
        </button>
      </form>
    </section>
  );
}

function PayablesSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [payable, setPayable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(): Promise<void> {
    setError(null);
    try {
      const result = await callApi((token) => getPoPayable(token, poId));
      setPayable(result.payable);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not check.');
    }
  }

  return (
    <section>
      <h2>Is this PO payable?</h2>
      <p className="note">
        INV-17 — derived from the three chain gates and from `bank_detail`, never a typed hold note.
      </p>
      <label htmlFor="pay-po">PO ID</label>
      <input id="pay-po" value={poId} onChange={(e) => setPoId(e.target.value)} />
      <button type="button" onClick={() => void check()} disabled={!poId}>
        Check
      </button>
      {payable !== null && <p className="note">{payable ? 'Payable.' : 'Not payable.'}</p>}
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function PaymentRunSection() {
  const { callApi } = useAuth();
  const [refId, setRefId] = useState('');
  const [kind, setKind] = useState<'payout' | 'refund'>('payout');
  const [paymentRunId, setPaymentRunId] = useState('');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showReauth, setShowReauth] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [released, setReleased] = useState(false);

  async function handleBuild(): Promise<void> {
    setBuildError(null);
    try {
      const result = await callApi((token) => buildPaymentRun(token, [{ kind, refId }]));
      setPaymentRunId(result.paymentRunId);
    } catch (submitError) {
      setBuildError(
        submitError instanceof ApiError ? submitError.message : 'Could not build this run.',
      );
    }
  }

  async function handleRelease(reauthToken: string): Promise<void> {
    setReleaseError(null);
    try {
      await callApi((token) => releasePaymentRun(token, reauthToken, paymentRunId));
      setReleased(true);
      setShowReauth(false);
    } catch (submitError) {
      setReleaseError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not release — did the builder try to release their own batch? (INV-16)',
      );
    }
  }

  return (
    <section>
      <h2>Payment runs</h2>
      <p className="note">
        BR-016/INV-16 — built by one person, released by another, whatever their role. The 13:00 /
        16:00 / 19:00 runs (BR-020) release every payable lot since the previous run; this builds
        and releases one run on demand for review.
      </p>

      <label htmlFor="pr-kind">Kind</label>
      <select id="pr-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
        <option value="payout">Payout (seller)</option>
        <option value="refund">Refund (buyer)</option>
      </select>
      <label htmlFor="pr-ref">PO ID (payout) or Refund ID (refund)</label>
      <input id="pr-ref" value={refId} onChange={(e) => setRefId(e.target.value)} />
      <button type="button" onClick={() => void handleBuild()} disabled={!refId}>
        Build run
      </button>
      {buildError && (
        <p className="note-urgent" role="alert">
          {buildError}
        </p>
      )}
      {paymentRunId && <p className="note">Built run {paymentRunId}.</p>}

      {paymentRunId && !released && (
        <div>
          {!showReauth ? (
            <button type="button" onClick={() => setShowReauth(true)}>
              Release this run
            </button>
          ) : (
            <ReauthPrompt onReauthed={(token) => void handleRelease(token)} />
          )}
          {releaseError && (
            <p className="note-urgent" role="alert">
              {releaseError}
            </p>
          )}
        </div>
      )}
      {released && <p className="note">Released.</p>}
    </section>
  );
}

function RepostSection() {
  const { callApi } = useAuth();
  const [bankbookId, setBankbookId] = useState('');
  const [reason, setReason] = useState('');
  const [partyId, setPartyId] = useState('');
  const [partyType, setPartyType] = useState<'buyer' | 'seller'>('buyer');
  const [amountRupees, setAmountRupees] = useState('');
  const [showReauth, setShowReauth] = useState(false);
  const [result, setResult] = useState<{ reversalId: string; correctedId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRepost(reauthToken: string): Promise<void> {
    setError(null);
    try {
      const outcome = await callApi((token) =>
        repostBankEntry(token, reauthToken, bankbookId, {
          reason,
          corrected: {
            kind: 'in',
            purpose: 'receipt',
            partyId,
            partyType,
            amountPaise: Math.round(Number(amountRupees) * 100),
          },
        }),
      );
      setResult(outcome);
      setShowReauth(false);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not repost.');
    }
  }

  return (
    <section>
      <h2>Reverse and repost</h2>
      <p className="note">
        BR-015 — Controller only. A wrong entry is never edited or deleted: a reversal is posted,
        then the correct entry on top.
      </p>
      <label htmlFor="rp-entry">Bank book entry ID</label>
      <input id="rp-entry" value={bankbookId} onChange={(e) => setBankbookId(e.target.value)} />
      <label htmlFor="rp-reason">Reason</label>
      <input id="rp-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <label htmlFor="rp-party">Corrected party ID</label>
      <input id="rp-party" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
      <label htmlFor="rp-party-type">Corrected party type</label>
      <select
        id="rp-party-type"
        value={partyType}
        onChange={(e) => setPartyType(e.target.value as typeof partyType)}
      >
        <option value="buyer">Buyer</option>
        <option value="seller">Seller</option>
      </select>
      <label htmlFor="rp-amount">Corrected amount (₹)</label>
      <input
        id="rp-amount"
        type="number"
        step="0.01"
        value={amountRupees}
        onChange={(e) => setAmountRupees(e.target.value)}
      />

      {!showReauth ? (
        <button
          type="button"
          onClick={() => setShowReauth(true)}
          disabled={!bankbookId || !reason || !partyId || !amountRupees}
        >
          Repost
        </button>
      ) : (
        <ReauthPrompt onReauthed={(token) => void handleRepost(token)} />
      )}
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="note">
          Reversal {result.reversalId}, corrected entry {result.correctedId}.
        </p>
      )}
    </section>
  );
}

function DayCloseSection() {
  const { callApi } = useAuth();
  const [statementClosingRupees, setStatementClosingRupees] = useState('');
  const [result, setResult] = useState<{ closingPaise: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(): Promise<void> {
    setError(null);
    try {
      setResult(
        await callApi((token) =>
          runDayClose(token, Math.round(Number(statementClosingRupees) * 100)),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not close the day — figures do not match (BR-308).',
      );
    }
  }

  return (
    <section>
      <h2>Day close</h2>
      <p className="note">
        BR-308 — a non-zero difference is the only thing that blocks a day close.
      </p>
      <label htmlFor="dc-closing">Statement closing balance (₹)</label>
      <input
        id="dc-closing"
        type="number"
        step="0.01"
        value={statementClosingRupees}
        onChange={(e) => setStatementClosingRupees(e.target.value)}
      />
      <button type="button" onClick={() => void handleRun()} disabled={!statementClosingRupees}>
        Close day
      </button>
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {result && <p className="note">Closed at ₹{(result.closingPaise / 100).toFixed(2)}.</p>}
    </section>
  );
}

function LedgersSection() {
  const { callApi } = useAuth();
  const [buyerId, setBuyerId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [buyerLedger, setBuyerLedger] = useState<number | null>(null);
  const [sellerLedger, setSellerLedger] = useState<number | null>(null);

  return (
    <section>
      <h2>Ledgers — computed, never typed (BR-014)</h2>
      <div>
        <label htmlFor="lg-buyer">Buyer ID</label>
        <input id="lg-buyer" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
        <button
          type="button"
          onClick={() =>
            void callApi((token) => getBuyerLedger(token, buyerId)).then((r) =>
              setBuyerLedger(r.ledgerPaise),
            )
          }
          disabled={!buyerId}
        >
          Look up
        </button>
        {buyerLedger !== null && <span> ₹{(buyerLedger / 100).toFixed(2)}</span>}
      </div>
      <div>
        <label htmlFor="lg-seller">Seller ID</label>
        <input id="lg-seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)} />
        <button
          type="button"
          onClick={() =>
            void callApi((token) => getSellerLedger(token, sellerId)).then((r) =>
              setSellerLedger(r.ledgerPaise),
            )
          }
          disabled={!sellerId}
        >
          Look up
        </button>
        {sellerLedger !== null && <span> ₹{(sellerLedger / 100).toFixed(2)}</span>}
      </div>
    </section>
  );
}
