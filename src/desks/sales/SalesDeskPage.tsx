import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheck, FiX, FiPhoneCall } from 'react-icons/fi';
import {
  getSalesWorklist,
  getMarketPulse,
  getRetention,
  getComplaintQueue,
  getMspQueue,
  respondToMsp,
  type SalesWorkItem,
} from '../../api/sales';
import { allocateUpcomingReceipt, getUpcomingReceipts } from '../../api/payment';
import { staffRegisterBuyer } from '../../api/onboarding';
import {
  proxyRaiseAsk,
  proxyAcceptAskFill,
  proxyDeclineAsk,
  proxyAcceptPromotion,
  proxyRejectPromotion,
} from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

const BUCKET_LABEL: Record<SalesWorkItem['bucket'], string> = {
  money: 'Money',
  promised: 'Promised',
  he_asked: 'He asked',
  market: 'Market',
};

/**
 * CH §19.8 — deliberately small: work grouped by what the customer is
 * waiting on (BR-282), payment allocation (IC-13 — this is Sales's own
 * accounting act, moved here from the Accounts desk), market pulse,
 * retention, MSP requests (IC-07 — coded refusal only) and complaint
 * routing.
 */
export function SalesDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
      <DevNote screen="sales_desk" />
      <LogBuyerCallSection />
      <AdvanceAskSection />
      <StaffAssistedBuyerRegistrationSection />
      <WorklistSection />
      <PaymentAllocationSection />
      <MspQueueSection />
      <ComplaintQueueSection />
      <PulseSection />
      <RetentionSection />
    </div>
  );
}

/**
 * Staff-assisted enquiries — "log a buyer call" (API-040, raise-an-ask).
 * Same validation as the buyer's own POST /asks: no price field exists on
 * this form at all (BR-121), exactly as the real endpoint refuses one sent.
 */
function LogBuyerCallSection() {
  const { callApi } = useAuth();
  const [buyerCounterpartyId, setBuyerCounterpartyId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(1);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ askId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyRaiseAsk(token, {
            buyerCounterpartyId,
            skuId,
            qty,
            conditionRequirement: { expiryBand },
            callNote,
          }),
        ),
      );
      setSkuId('');
      setQty(1);
      setCallNote('');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log a buyer call">
      <p className="mb-4 text-sm text-slate-500">
        Raises an ask on the buyer&apos;s behalf — same as the buyer&apos;s own screen. He states no
        price; TriFid never names one before a seller has (BR-121).
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="lbc-buyer"
          label="Buyer counterparty ID"
          value={buyerCounterpartyId}
          onChange={(e) => setBuyerCounterpartyId(e.target.value)}
          required
        />
        <Input
          id="lbc-sku"
          label="SKU ID"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        />
        <Input
          id="lbc-qty"
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
        />
        <Select
          id="lbc-expiry"
          label="Expiry requirement"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as typeof expiryBand)}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Textarea
          id="lbc-note"
          label="Call note"
          hint="Who called, what was agreed — mandatory on every staff-assisted action."
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Logged as ask {result.askId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
          Log call
        </Button>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries — advancing an ask on a call (API-042 accept-fill
 * / API-043 walk-away), and the WF-11 promoted-fallback decision (API-071)
 * a buyer might also decide over the phone.
 */
function AdvanceAskSection() {
  const { callApi } = useAuth();
  const [askId, setAskId] = useState('');
  const [buyerCounterpartyId, setBuyerCounterpartyId] = useState('');
  const [option, setOption] = useState<'partial' | 'full'>('full');
  const [quoteIdsText, setQuoteIdsText] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [soId, setSoId] = useState('');
  const [promotionNote, setPromotionNote] = useState('');
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const quoteIds = quoteIdsText
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const result = await callApi((token) =>
        proxyAcceptAskFill(token, askId, { buyerCounterpartyId, option, quoteIds, callNote }),
      );
      setMessage(`Accepted — order(s): ${result.soIds.join(', ')}.`);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept this fill.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => proxyDeclineAsk(token, askId, { buyerCounterpartyId, callNote }));
      setMessage('Walked away — free, no strike.');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not decline.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromotionAccept(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyAcceptPromotion(token, soId, {
          buyerCounterpartyId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Accepted the replacement seller.');
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept.',
      );
    }
  }

  async function handlePromotionReject(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyRejectPromotion(token, soId, {
          buyerCounterpartyId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Declined — refunded on the next run.');
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not decline.',
      );
    }
  }

  return (
    <Card title="Advance an ask on a call">
      <p className="mb-4 text-sm text-slate-500">
        Confirming a rate over the phone and accepting a fill are the same action in this system
        (API-042) — enter the quote(s) the buyer accepted below. Walking away is free and never a
        strike (API-043).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="aa-ask"
          label="Ask ID"
          value={askId}
          onChange={(e) => setAskId(e.target.value)}
          required
        />
        <Input
          id="aa-buyer"
          label="Buyer counterparty ID"
          value={buyerCounterpartyId}
          onChange={(e) => setBuyerCounterpartyId(e.target.value)}
          required
        />
        <Select
          id="aa-option"
          label="Option"
          value={option}
          onChange={(e) => setOption(e.target.value as typeof option)}
        >
          <option value="full">Full — the partial plus the balance</option>
          <option value="partial">Partial — the cheap portion alone</option>
        </Select>
        <Input
          id="aa-quotes"
          label="Quote ID(s), comma-separated"
          value={quoteIdsText}
          onChange={(e) => setQuoteIdsText(e.target.value)}
        />
        <Textarea
          id="aa-note"
          label="Call note"
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-success-600">{message}</p>}
        <div className="flex gap-2">
          <Button
            loading={submitting}
            disabled={!askId || !buyerCounterpartyId || !callNote}
            onClick={() => void handleAccept()}
            icon={<FiCheck />}
          >
            Accept fill
          </Button>
          <Button
            variant="secondary"
            loading={submitting}
            disabled={!askId || !buyerCounterpartyId || !callNote}
            onClick={() => void handleDecline()}
            icon={<FiX />}
          >
            Walk away
          </Button>
        </div>
      </div>

      <div className="mt-6 flex max-w-md flex-col gap-4 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Promoted-fallback decision (WF-11)</h3>
        <Input
          id="aa-so"
          label="Order (SO) ID"
          value={soId}
          onChange={(e) => setSoId(e.target.value)}
        />
        <Textarea
          id="aa-promo-note"
          label="Call note"
          value={promotionNote}
          onChange={(e) => setPromotionNote(e.target.value)}
        />
        {promotionError && (
          <p role="alert" className="text-sm text-danger-500">
            {promotionError}
          </p>
        )}
        {promotionMessage && <p className="text-sm text-success-600">{promotionMessage}</p>}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!soId || !buyerCounterpartyId || !promotionNote}
            onClick={() => void handlePromotionAccept()}
            icon={<FiCheck />}
          >
            Accept replacement
          </Button>
          <Button
            variant="secondary"
            disabled={!soId || !buyerCounterpartyId || !promotionNote}
            onClick={() => void handlePromotionReject()}
            icon={<FiX />}
          >
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Staff-assisted enquiries — the OTP-confirmation step itself is shown honestly as pending on the Registrations desk once submitted here. */
function StaffAssistedBuyerRegistrationSection() {
  const { callApi } = useAuth();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [gstPpobAddress, setGstPpobAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ registrationId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          staffRegisterBuyer(token, {
            mobile,
            firm,
            gstin,
            ownerName,
            licenceNo,
            gstPpobAddress,
            bankDetail: { accountNumber, ifsc, accountName },
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not register this buyer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Staff-assisted buyer registration">
      <p className="mb-4 text-sm text-slate-500">
        GSTIN stays mandatory, exactly as self-service registration. A single OTP goes to the real
        mobile number to confirm this is genuine before it can be approved — check the Registrations
        desk for that status once submitted.
      </p>
      <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
        <Input
          id="sr-mobile"
          label="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
        <Input
          id="sr-firm"
          label="Firm"
          value={firm}
          onChange={(e) => setFirm(e.target.value)}
          required
        />
        <Input
          id="sr-gstin"
          label="GSTIN"
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          required
        />
        <Input
          id="sr-owner"
          label="Owner name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />
        <Input
          id="sr-licence"
          label="Insecticide licence no."
          value={licenceNo}
          onChange={(e) => setLicenceNo(e.target.value)}
          required
        />
        <Input
          id="sr-address"
          label="GST principal place of business"
          value={gstPpobAddress}
          onChange={(e) => setGstPpobAddress(e.target.value)}
          required
        />
        <Input
          id="sr-account"
          label="Bank account number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />
        <Input
          id="sr-ifsc"
          label="IFSC"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value)}
          required
        />
        <Input
          id="sr-account-name"
          label="Account name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
        <div className="col-span-2">
          <Textarea
            id="sr-note"
            label="Call note"
            hint="Who called, what was agreed."
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="col-span-2 text-sm text-success-600">
            Registered as {result.registrationId} — pending OTP confirmation.
          </p>
        )}
        <div className="col-span-2">
          <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
            Register buyer
          </Button>
        </div>
      </form>
    </Card>
  );
}

function WorklistSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSalesWorklist(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="My work (BR-282)">
      <p className="mb-4 text-sm text-slate-500">
        Grouped by what the customer is waiting on, not by stage.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Waiting on</Th>
                <Th>Type</Th>
                <Th>Ref</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.refType}-${item.refId}-${index}`}>
                  <Td>
                    <Badge tone={item.bucket === 'money' ? 'bad' : 'neutral'}>
                      {BUCKET_LABEL[item.bucket]}
                    </Badge>
                  </Td>
                  <Td>{item.refType}</Td>
                  <Td>{item.refId.slice(-6)}</Td>
                  <Td>{item.dueAt ? new Date(item.dueAt).toLocaleString() : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

/** IC-13 — this is Sales's own accounting act (BR-012, `CH §19.9`); Accounts posts what lands, Sales says which SOs a claim covers. */
function PaymentAllocationSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getUpcomingReceipts(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [receiptId, setReceiptId] = useState('');
  const [soIdsText, setSoIdsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card title="Allocate a payment (IC-13)">
      <p className="mb-4 text-sm text-slate-500">
        A buyer&apos;s claim, not yet money — it touches no bank book and no ledger until Accounts
        posts it against exactly the SO picked here (BR-012, INV-15).
      </p>
      <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-slate-700">
        <strong>One receipt, one order (QR-057).</strong> A receipt cannot be split across orders.
        If the buyer&apos;s one bank transfer pays two orders, record it as two separate receipts
        against the same bank credit, one per order. The system refuses more than one order here.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items) => (
          <Table className="mb-4">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Buyer</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.upcomingReceiptId}>
                  <Td>{item.upcomingReceiptId}</Td>
                  <Td>{item.buyerId}</Td>
                  <Td>₹{(item.amountPaise / 100).toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          const soIds = soIdsText
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          callApi((token) => allocateUpcomingReceipt(token, receiptId, soIds))
            .then(() => {
              setReceiptId('');
              setSoIdsText('');
              retry();
            })
            .catch((err: unknown) =>
              setError(err instanceof ApiError ? err.message : 'Could not allocate.'),
            )
            .finally(() => setSubmitting(false));
        }}
        className="flex max-w-md flex-col gap-4"
      >
        <Input
          label="Upcoming receipt ID"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          required
        />
        <Input
          label="SO ID (exactly one)"
          value={soIdsText}
          onChange={(e) => setSoIdsText(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting}>
          Allocate
        </Button>
      </form>
    </Card>
  );
}

function MspQueueSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getMspQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="MSP requests (IC-07)">
      <p className="mb-4 text-sm text-slate-500">
        A refusal is always one of the fixed codes below — never a floor, a limit or a margin.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing pending.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Buyer</Th>
                <Th>Qty</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.mspRequestId}>
                  <Td>{item.buyerId.slice(-6)}</Td>
                  <Td>{item.qty}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        icon={<FiCheck />}
                        onClick={() =>
                          void callApi((token) =>
                            respondToMsp(token, item.mspRequestId, { granted: true }),
                          ).then(retry)
                        }
                      >
                        Grant
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiX />}
                        onClick={() =>
                          void callApi((token) =>
                            respondToMsp(token, item.mspRequestId, {
                              granted: false,
                              refusalCode: 'already_at_the_best_available_rate',
                            }),
                          ).then(retry)
                        }
                      >
                        Refuse
                      </Button>
                    </div>
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

// Corrected M7 (QR-048/BR-206) — Controller decides fault; this is the
// buyer-conversation half only, never the seller or the seller's number.
// `transit_damage` (`'unhandled'`) is shown separately, visibly unresolved
// (QR-050).
function ComplaintQueueSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getComplaintQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Complaints — buyer conversation (BR-201/BR-206)">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No complaints on file.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Outcome to relay</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.complaintId}>
                  <Td>{item.soId.slice(-6)}</Td>
                  <Td>{item.category.replaceAll('_', ' ')}</Td>
                  <Td>
                    <Badge>
                      {item.destination === 'unhandled'
                        ? 'unhandled — QR-050'
                        : item.disposition
                          ? 'decided'
                          : 'awaiting Controller'}
                    </Badge>
                  </Td>
                  <Td>{item.resolutionNote ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function PulseSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getMarketPulse(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Market pulse (BR-278)">
      <p className="mb-4 text-sm text-slate-500">A call list, nothing else — it sets no rate.</p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing to report yet.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Tehsil</Th>
                <Th>Product</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => i.status !== 'steady')
                .map((item, index) => (
                  <tr key={index}>
                    <Td>{item.areaTehsilId.slice(-6)}</Td>
                    <Td>{item.productId.slice(-6)}</Td>
                    <Td>
                      <Badge tone={item.status === 'rising' ? 'good' : 'bad'}>{item.status}</Badge>
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

function RetentionSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getRetention(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Retention (BR-281)">
      <p className="mb-4 text-sm text-slate-500">
        Of the buyers whose first order fell in a month, how many ordered again within 90 days.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Not enough history yet.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Month</Th>
                <Th>First orders</Th>
                <Th>Retained</Th>
                <Th>%</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.month}>
                  <Td>{item.month}</Td>
                  <Td>{item.firstOrderCount}</Td>
                  <Td>{item.retainedCount}</Td>
                  <Td>{item.retentionPct}%</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
