import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheck, FiSearch, FiPlay, FiRefreshCw, FiLock, FiMoon } from 'react-icons/fi';
import {
  buildPaymentRun,
  getBuyerLedger,
  getGstUnfiledQueue,
  getPoPayable,
  getSellerLedger,
  getUpcomingReceipts,
  markSellerBillFiled,
  postBankCredit,
  recordReceiptConfirmation,
  releasePaymentRun,
  repostBankEntry,
  runDayClose,
} from '../../api/payment';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { ReauthPrompt } from '../../components/ReauthPrompt';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Accounts</h1>
      <DevNote screen="admin_accounts" />
      <UpcomingReceiptsSection />
      <PostBankCreditSection />
      <ReceiptConfirmationSection />
      <PayablesSection />
      <PaymentRunSection />
      <RepostSection />
      <DayCloseSection />
      <LedgersSection />
      <GstUnfiledSection />
    </div>
  );
}

function UpcomingReceiptsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getUpcomingReceipts(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Upcoming receipts">
      <p className="mb-4 text-sm text-slate-500">
        BR-011/INV-15 — a buyer&apos;s claim. Not money yet — it touches no bank book and no ledger
        until Sales allocates it to specific SOs (see the Sales desk, IC-13) and it is posted below.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items: UpcomingReceiptListItem[]) => (
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Buyer</Th>
                <Th>Amount</Th>
                <Th>Claimed</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.upcomingReceiptId}>
                  <Td>{item.upcomingReceiptId}</Td>
                  <Td>{item.buyerId}</Td>
                  <Td>₹{(item.amountPaise / 100).toFixed(2)}</Td>
                  <Td>{new Date(item.claimedAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
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
    <Card title="Post a bank credit">
      <p className="mb-4 text-sm text-slate-500">
        BR-027 — only Accounts may mark a payment verified, and every mark carries a UTR and a
        person. Matched against the bank statement by hand at the 13:00/16:00/19:00 run.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="pb-receipt"
          label="Upcoming receipt ID (must be allocated first)"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          required
        />
        <Input
          id="pb-utr"
          label="Statement UTR"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          required
        />
        <Input
          id="pb-account"
          label="Remitter account number"
          value={remitterAccountNumber}
          onChange={(e) => setRemitterAccountNumber(e.target.value)}
          required
        />
        <Input
          id="pb-ifsc"
          label="Remitter IFSC"
          value={remitterIfsc}
          onChange={(e) => setRemitterIfsc(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Posted as {result.bankbookId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiCheck />}>
          Post credit
        </Button>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries, decision (B) — Accounts' own dedicated
 * confirmation of product and quantity received, as its own recorded step,
 * distinct from and in addition to the dock's inspection record shown on
 * the Dock desk. This is the fourth fact the payable gate checks, alongside
 * inspection, seller bill and bank detail.
 */
function ReceiptConfirmationSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [productMatches, setProductMatches] = useState(true);
  const [qtyMatches, setQtyMatches] = useState(true);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ receiptConfirmationId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          recordReceiptConfirmation(token, poId, {
            productMatches,
            qtyMatches,
            notes: notes || undefined,
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not record this confirmation.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Confirm product and quantity received (Accounts)">
      <p className="mb-4 text-sm text-slate-500">
        Accounts&apos; own explicit check, separate from the dock&apos;s inspection record on the
        Dock desk — a fourth fact the payable gate requires alongside inspection, the seller bill
        and bank detail. Once submitted this cannot be changed.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="rc-po"
          label="PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          required
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={productMatches}
            onChange={(e) => setProductMatches(e.target.checked)}
          />
          Product matches
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={qtyMatches}
            onChange={(e) => setQtyMatches(e.target.checked)}
          />
          Quantity matches
        </label>
        <Input
          id="rc-notes"
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">Recorded as {result.receiptConfirmationId}.</p>
        )}
        <Button type="submit" loading={submitting} disabled={!poId} icon={<FiCheck />}>
          Confirm
        </Button>
      </form>
    </Card>
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
    <Card title="Is this PO payable?">
      <p className="mb-4 text-sm text-slate-500">
        INV-17 — derived from the three chain gates and from `bank_detail`, never a typed hold note.
      </p>
      <div className="flex max-w-md flex-wrap items-end gap-3">
        <Input id="pay-po" label="PO ID" value={poId} onChange={(e) => setPoId(e.target.value)} />
        <Button
          variant="secondary"
          onClick={() => void check()}
          disabled={!poId}
          icon={<FiSearch />}
        >
          Check
        </Button>
        {payable !== null && (
          <Badge tone={payable ? 'good' : 'bad'}>{payable ? 'Payable' : 'Not payable'}</Badge>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
    </Card>
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
    <Card title="Payment runs">
      <p className="mb-4 text-sm text-slate-500">
        BR-016/INV-16 — built by one person, released by another, whatever their role. The 13:00 /
        16:00 / 19:00 runs (BR-020) release every payable lot since the previous run; this builds
        and releases one run on demand for review.
      </p>

      <div className="mb-4 flex max-w-md flex-wrap items-end gap-3">
        <Select
          id="pr-kind"
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="payout">Payout (seller)</option>
          <option value="refund">Refund (buyer)</option>
        </Select>
        <Input
          id="pr-ref"
          label="PO ID (payout) or Refund ID (refund)"
          value={refId}
          onChange={(e) => setRefId(e.target.value)}
        />
        <Button
          variant="secondary"
          onClick={() => void handleBuild()}
          disabled={!refId}
          icon={<FiPlay />}
        >
          Build run
        </Button>
      </div>
      {buildError && (
        <p role="alert" className="mb-2 text-sm text-danger-500">
          {buildError}
        </p>
      )}
      {paymentRunId && <p className="mb-2 text-sm text-success-600">Built run {paymentRunId}.</p>}

      {paymentRunId && !released && (
        <div className="flex flex-col gap-3">
          {!showReauth ? (
            <Button
              variant="danger"
              onClick={() => setShowReauth(true)}
              icon={<FiLock />}
              className="self-start"
            >
              Release this run
            </Button>
          ) : (
            <ReauthPrompt onReauthed={(token) => void handleRelease(token)} />
          )}
          {releaseError && (
            <p role="alert" className="text-sm text-danger-500">
              {releaseError}
            </p>
          )}
        </div>
      )}
      {released && <p className="text-sm text-success-600">Released.</p>}
    </Card>
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
    <Card title="Reverse and repost">
      <p className="mb-4 text-sm text-slate-500">
        BR-015 — Controller only. A wrong entry is never edited or deleted: a reversal is posted,
        then the correct entry on top.
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="rp-entry"
          label="Bank book entry ID"
          value={bankbookId}
          onChange={(e) => setBankbookId(e.target.value)}
        />
        <Input
          id="rp-reason"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Input
          id="rp-party"
          label="Corrected party ID"
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
        />
        <Select
          id="rp-party-type"
          label="Corrected party type"
          value={partyType}
          onChange={(e) => setPartyType(e.target.value as typeof partyType)}
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
        </Select>
        <Input
          id="rp-amount"
          label="Corrected amount (₹)"
          type="number"
          step="0.01"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
        />

        {!showReauth ? (
          <Button
            variant="danger"
            onClick={() => setShowReauth(true)}
            disabled={!bankbookId || !reason || !partyId || !amountRupees}
            icon={<FiRefreshCw />}
            className="self-start"
          >
            Repost
          </Button>
        ) : (
          <ReauthPrompt onReauthed={(token) => void handleRepost(token)} />
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">
            Reversal {result.reversalId}, corrected entry {result.correctedId}.
          </p>
        )}
      </div>
    </Card>
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
    <Card title="Day close">
      <p className="mb-4 text-sm text-slate-500">
        BR-308 — a non-zero difference is the only thing that blocks a day close.
      </p>
      <div className="flex max-w-md flex-wrap items-end gap-3">
        <Input
          id="dc-closing"
          label="Statement closing balance (₹)"
          type="number"
          step="0.01"
          value={statementClosingRupees}
          onChange={(e) => setStatementClosingRupees(e.target.value)}
        />
        <Button
          onClick={() => void handleRun()}
          disabled={!statementClosingRupees}
          icon={<FiMoon />}
        >
          Close day
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-2 text-sm text-success-600">
          Closed at ₹{(result.closingPaise / 100).toFixed(2)}.
        </p>
      )}
    </Card>
  );
}

function LedgersSection() {
  const { callApi } = useAuth();
  const [buyerId, setBuyerId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [buyerLedger, setBuyerLedger] = useState<number | null>(null);
  const [sellerLedger, setSellerLedger] = useState<number | null>(null);

  return (
    <Card title="Ledgers — computed, never typed (BR-014)">
      <div className="flex flex-col gap-4">
        <div className="flex max-w-md flex-wrap items-end gap-3">
          <Input
            id="lg-buyer"
            label="Buyer ID"
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() =>
              void callApi((token) => getBuyerLedger(token, buyerId)).then((r) =>
                setBuyerLedger(r.ledgerPaise),
              )
            }
            disabled={!buyerId}
            icon={<FiSearch />}
          >
            Look up
          </Button>
          {buyerLedger !== null && (
            <span className="text-sm font-medium text-slate-700">
              ₹{(buyerLedger / 100).toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex max-w-md flex-wrap items-end gap-3">
          <Input
            id="lg-seller"
            label="Seller ID"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() =>
              void callApi((token) => getSellerLedger(token, sellerId)).then((r) =>
                setSellerLedger(r.ledgerPaise),
              )
            }
            disabled={!sellerId}
            icon={<FiSearch />}
          >
            Look up
          </Button>
          {sellerLedger !== null && (
            <span className="text-sm font-medium text-slate-700">
              ₹{(sellerLedger / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// New — M7, BR-023. The one genuine new Accounts gap: the field existed
// since M4 (SellerBill.filed) with nothing reading it until now.
function GstUnfiledSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getGstUnfiledQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="GST — unfiled bills (BR-023)">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing unfiled.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Bill</Th>
                <Th>Seller</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sellerBillId}>
                  <Td>{item.billNo}</Td>
                  <Td>{item.sellerId.slice(-6)}</Td>
                  <Td>₹{(item.totalPaise / 100).toFixed(2)}</Td>
                  <Td>{new Date(item.date).toLocaleDateString()}</Td>
                  <Td>
                    <Button
                      variant="secondary"
                      icon={<FiCheck />}
                      onClick={() =>
                        void callApi((token) => markSellerBillFiled(token, item.sellerBillId)).then(
                          () => retry(),
                        )
                      }
                    >
                      Mark filed
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
