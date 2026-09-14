import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheck, FiSearch, FiPlay, FiRefreshCw, FiLock, FiMoon } from 'react-icons/fi';
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
      <UpcomingReceiptsSection />
      <PostBankCreditSection />
      <PayablesSection />
      <PaymentRunSection />
      <RepostSection />
      <DayCloseSection />
      <LedgersSection />
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
        until it is allocated and posted below.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items: UpcomingReceiptListItem[]) => (
          <Table className="mb-4">
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
      <AllocateForm onDone={retry} />
    </Card>
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
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        Allocate — BR-012, Sales knows which order he meant
      </h3>
      <Input
        id="al-receipt"
        label="Upcoming receipt ID"
        value={receiptId}
        onChange={(e) => setReceiptId(e.target.value)}
        required
      />
      <Input
        id="al-sos"
        label="SO IDs (comma-separated)"
        value={soIdsText}
        onChange={(e) => setSoIdsText(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <Button type="submit" loading={submitting} icon={<FiCheck />}>
        Allocate
      </Button>
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
