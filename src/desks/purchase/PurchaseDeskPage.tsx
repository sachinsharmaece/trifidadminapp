import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiFlag, FiCheck, FiX, FiPhoneCall } from 'react-icons/fi';
import {
  getActiveDemandList,
  getAbsorptionQueue,
  getFunnelReport,
  getReturnNoteAgeing,
  getSellerRecoveryQueue,
  postNonOrderReason,
  type ActiveDemandItem,
} from '../../api/purchase';
import { staffRegisterSeller } from '../../api/onboarding';
import {
  proxyCreateListing,
  proxyConfirmPile,
  proxyRequotePile,
  proxyDeclinePile,
} from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { PERMISSIONS } from '../../lib/permissions';
import { FunnelMetricsGrid } from './FunnelMetrics';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

const SUPPLY_GAP_CODES = [
  'rate_above_market',
  'expiry_too_short',
  'delivery_too_slow',
  'moq_too_big',
  'quantity_short',
  'no_seller_in_scope',
] as const;

/**
 * CH §19.8 — kept deliberately small: the active demand list (with the
 * No-seller filter, BR-270), the absorption queue (delta and within-cap
 * only — IC-06), and return-note ageing (BR-189). BR-069 — nothing on this
 * page ever shows a buyer's identity or a rupee figure.
 */
export function PurchaseDeskPage() {
  const { hasPermission } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Purchase</h1>
      <DevNote screen="purchase_desk" />
      <LogSellerCallSection />
      <AdvancePileSection />
      <StaffAssistedSellerRegistrationSection />
      {hasPermission(PERMISSIONS.FUNNEL_READ) && <FunnelSection />}
      <ActiveDemandSection />
      <AbsorptionQueueSection />
      <ReturnAgeingSection />
      <SellerRecoverySection />
    </div>
  );
}

/**
 * Staff-assisted enquiries — "log a seller call" (API-033, create-listing).
 * Same fields, same validation as the seller's own POST /listings: the
 * shelf-life floor, the two delivery bands with no provenance constraint,
 * MOQ — nothing here bypasses any of it.
 */
function LogSellerCallSection() {
  const { callApi } = useAuth();
  const [sellerCounterpartyId, setSellerCounterpartyId] = useState('');
  const [productId, setProductId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [ratePaise, setRatePaise] = useState(0);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [expiryExact, setExpiryExact] = useState('');
  const [deliveryBand, setDeliveryBand] = useState<'48h' | '2-5d'>('48h');
  const [provenance, setProvenance] = useState<'company' | 'auth'>('company');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState(1);
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ listingId: string; lineIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyCreateListing(token, {
            sellerCounterpartyId,
            productId,
            scopeType: 'my_area',
            lines: [
              {
                skuId,
                ratePaise,
                expiryBand,
                expiryExact: expiryExact || undefined,
                deliveryBand,
                provenance,
                batch: provenance === 'auth' ? batch : undefined,
                qty,
              },
            ],
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log a seller call">
      <p className="mb-4 text-sm text-slate-500">
        Creates a listing on the seller&apos;s behalf — same fields, same validation as the
        seller&apos;s own screen: the six-month shelf-life floor, the batch requirement on
        auth-provenance stock, MOQ.
      </p>
      <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
        <Input
          id="lsc-seller"
          label="Seller counterparty ID"
          value={sellerCounterpartyId}
          onChange={(e) => setSellerCounterpartyId(e.target.value)}
          required
        />
        <Input
          id="lsc-product"
          label="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        />
        <Input
          id="lsc-sku"
          label="SKU ID"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        />
        <Input
          id="lsc-rate"
          label="Rate (paise)"
          type="number"
          min={1}
          value={ratePaise}
          onChange={(e) => setRatePaise(Number(e.target.value))}
          required
        />
        <Select
          id="lsc-expiry-band"
          label="Expiry band"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as typeof expiryBand)}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Input
          id="lsc-expiry-exact"
          label="Expiry (MM/YYYY, optional)"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        <Select
          id="lsc-delivery"
          label="Delivery band"
          value={deliveryBand}
          onChange={(e) => setDeliveryBand(e.target.value as typeof deliveryBand)}
        >
          <option value="48h">48 hours</option>
          <option value="2-5d">2–5 days</option>
        </Select>
        <Select
          id="lsc-provenance"
          label="Provenance"
          value={provenance}
          onChange={(e) => setProvenance(e.target.value as typeof provenance)}
        >
          <option value="company">Company</option>
          <option value="auth">Authorised dealer</option>
        </Select>
        {provenance === 'auth' && (
          <Input
            id="lsc-batch"
            label="Batch (mandatory on auth provenance)"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            required
          />
        )}
        <Input
          id="lsc-qty"
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
        />
        <div className="col-span-2">
          <Textarea
            id="lsc-note"
            label="Call note"
            hint="Who called, what was agreed — mandatory on every staff-assisted action."
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
            Logged as listing {result.listingId}.
          </p>
        )}
        <div className="col-span-2">
          <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
            Log call
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries — advancing a listing/pile decision on a call
 * (API-049 confirm / API-050 requote / decline). The exact-expiry-and-batch
 * gate (IC-21) applies here exactly as it does on every other path — a
 * phone-based confirm does not bypass it.
 */
function AdvancePileSection() {
  const { callApi } = useAuth();
  const [pileId, setPileId] = useState('');
  const [sellerCounterpartyId, setSellerCounterpartyId] = useState('');
  const [canSendBoxes, setCanSendBoxes] = useState(0);
  const [expiryExact, setExpiryExact] = useState('');
  const [batch, setBatch] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyConfirmPile(token, pileId, {
          sellerCounterpartyId,
          canSendBoxes,
          expiryExact,
          batch: batch || undefined,
          callNote,
        }),
      );
      setMessage('Confirmed — each buyer gets his own order.');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not confirm.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequote(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => proxyRequotePile(token, pileId, { sellerCounterpartyId, callNote }));
      setMessage('Requoted — every buyer on the line is asked to accept or cancel.');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not requote.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) => proxyDeclinePile(token, pileId, { sellerCounterpartyId, callNote }));
      setMessage('Declined — free before payment.');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not decline.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Advance a listing/pile decision on a call">
      <p className="mb-4 text-sm text-slate-500">
        Confirm will not submit without the exact expiry month, and the batch where provenance is
        auth-stock — the same gate that applies on every other confirm path (IC-21).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="ap-pile"
          label="Pile ID"
          value={pileId}
          onChange={(e) => setPileId(e.target.value)}
          required
        />
        <Input
          id="ap-seller"
          label="Seller counterparty ID"
          value={sellerCounterpartyId}
          onChange={(e) => setSellerCounterpartyId(e.target.value)}
          required
        />
        <Input
          id="ap-boxes"
          label="Boxes he can send"
          type="number"
          min={0}
          value={canSendBoxes}
          onChange={(e) => setCanSendBoxes(Number(e.target.value))}
        />
        <Input
          id="ap-expiry"
          label="Exact expiry (MM/YYYY)"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        <Input
          id="ap-batch"
          label="Batch (mandatory on auth stock)"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />
        <Textarea
          id="ap-note"
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
            disabled={!pileId || !sellerCounterpartyId || !callNote}
            onClick={() => void handleConfirm()}
            icon={<FiCheck />}
          >
            Confirm
          </Button>
          <Button
            variant="secondary"
            loading={submitting}
            disabled={!pileId || !sellerCounterpartyId || !callNote}
            onClick={() => void handleRequote()}
          >
            Requote
          </Button>
          <Button
            variant="secondary"
            loading={submitting}
            disabled={!pileId || !sellerCounterpartyId || !callNote}
            onClick={() => void handleDecline()}
            icon={<FiX />}
          >
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Staff-assisted enquiries — the OTP-confirmation step is shown honestly as pending on the Registrations desk once submitted here. */
function StaffAssistedSellerRegistrationSection() {
  const { callApi } = useAuth();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [refFirm1, setRefFirm1] = useState('');
  const [refPhone1, setRefPhone1] = useState('');
  const [refFirm2, setRefFirm2] = useState('');
  const [refPhone2, setRefPhone2] = useState('');
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
          staffRegisterSeller(token, {
            mobile,
            firm,
            gstin,
            ownerName,
            licenceNo,
            references: [
              {
                firm: refFirm1,
                phone: refPhone1,
                relationship: 'Supplier',
                whatTheySaid: 'Reliable',
              },
              {
                firm: refFirm2,
                phone: refPhone2,
                relationship: 'Supplier',
                whatTheySaid: 'Reliable',
              },
            ],
            bankDetail: { accountNumber, ifsc, accountName },
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not register this seller.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Staff-assisted seller registration">
      <p className="mb-4 text-sm text-slate-500">
        GSTIN stays mandatory, exactly as self-service registration, plus BR-250&apos;s two named
        referees. A single OTP goes to the real mobile number to confirm this is genuine before it
        can be approved.
      </p>
      <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
        <Input
          id="ss-mobile"
          label="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
        <Input
          id="ss-firm"
          label="Firm"
          value={firm}
          onChange={(e) => setFirm(e.target.value)}
          required
        />
        <Input
          id="ss-gstin"
          label="GSTIN"
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          required
        />
        <Input
          id="ss-owner"
          label="Owner name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />
        <Input
          id="ss-licence"
          label="Insecticide licence no."
          value={licenceNo}
          onChange={(e) => setLicenceNo(e.target.value)}
          required
        />
        <Input
          id="ss-account"
          label="Bank account number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />
        <Input
          id="ss-ifsc"
          label="IFSC"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value)}
          required
        />
        <Input
          id="ss-account-name"
          label="Account name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
        <Input
          id="ss-ref1-firm"
          label="Referee 1 — firm"
          value={refFirm1}
          onChange={(e) => setRefFirm1(e.target.value)}
          required
        />
        <Input
          id="ss-ref1-phone"
          label="Referee 1 — phone"
          value={refPhone1}
          onChange={(e) => setRefPhone1(e.target.value)}
          required
        />
        <Input
          id="ss-ref2-firm"
          label="Referee 2 — firm"
          value={refFirm2}
          onChange={(e) => setRefFirm2(e.target.value)}
          required
        />
        <Input
          id="ss-ref2-phone"
          label="Referee 2 — phone"
          value={refPhone2}
          onChange={(e) => setRefPhone2(e.target.value)}
          required
        />
        <div className="col-span-2">
          <Textarea
            id="ss-note"
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
            Register seller
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * New — M8, BR-275. "Purchase is measured on leaks closed, not orders placed."
 * Each figure states its own formula; the window is fixed, not a setting.
 */
function FunnelSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getFunnelReport(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <Card title="Leaks closed — funnel and leak analytics (BR-275)">
      <AsyncBoundary state={state} onRetry={retry}>
        {(report) => (
          <>
            <p className="mb-4 text-sm text-slate-500">
              The last {report.windowDays} days, counted from live data. Counts, hours and
              percentages only — no rupee figure and no buyer identity (BR-067, BR-069).
            </p>
            <FunnelMetricsGrid report={report} />
          </>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ActiveDemandSection() {
  const { callApi } = useAuth();
  const [noSellerOnly, setNoSellerOnly] = useState(false);
  const loader = useCallback(
    () => callApi((token) => getActiveDemandList(token, noSellerOnly)),
    [callApi, noSellerOnly],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Active demand">
      <p className="mb-4 text-sm text-slate-500">
        BR-272 — how many sellers are quoted, active, dormant or dark against each open ask. No
        buyer identity, no rupee figure (BR-069).
      </p>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={noSellerOnly}
          onChange={(e) => setNoSellerOnly(e.target.checked)}
        />
        No-seller only (BR-270 — an opportunity, not a leak)
      </label>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing open right now.">
        {(items: ActiveDemandItem[]) => (
          <Table className="mb-4">
            <thead>
              <tr>
                <Th>Ask</Th>
                <Th>Boxes</Th>
                <Th>Quoted</Th>
                <Th>Active</Th>
                <Th>Dormant</Th>
                <Th>No seller</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.askId}>
                  <Td>{item.askId.slice(-6)}</Td>
                  <Td>{item.qty}</Td>
                  <Td>{item.sellerCounts.quoted}</Td>
                  <Td>{item.sellerCounts.active}</Td>
                  <Td>{item.sellerCounts.dormant}</Td>
                  <Td>
                    {item.noSeller && (
                      <Badge tone="warn">
                        <FiFlag className="inline" /> No seller
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <NonOrderReasonForm askId={item.askId} onRecorded={retry} />
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

function NonOrderReasonForm({ askId, onRecorded }: { askId: string; onRecorded: () => void }) {
  const { callApi } = useAuth();
  const [code, setCode] = useState<string>(SUPPLY_GAP_CODES[0]);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select
        id={`nor-${askId}`}
        label=""
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="text-xs"
      >
        {SUPPLY_GAP_CODES.map((c) => (
          <option key={c} value={c}>
            {c.replaceAll('_', ' ')}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          void callApi((token) => postNonOrderReason(token, { askId, code })).then(() => {
            setSaved(true);
            onRecorded();
          })
        }
      >
        {saved ? 'Saved' : 'Log reason'}
      </Button>
    </div>
  );
}

function AbsorptionQueueSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getAbsorptionQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Absorption (WF-11)">
      <p className="mb-4 text-sm text-slate-500">
        IC-06 — delta and within-cap only. This screen never shows the absorption cap or either
        seller&apos;s rate, by construction — the API response carries neither.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No replacement offers right now.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>SO</Th>
                <Th>Status</Th>
                <Th>Delta</Th>
                <Th>Within cap</Th>
                <Th>Expires</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.soId}>
                  <Td>{item.soId.slice(-6)}</Td>
                  <Td>
                    <Badge
                      tone={
                        item.status === 'accepted'
                          ? 'good'
                          : item.status === 'pending'
                            ? 'warn'
                            : 'bad'
                      }
                    >
                      {item.status}
                    </Badge>
                  </Td>
                  <Td>₹{(item.deltaPaise / 100).toFixed(2)}</Td>
                  <Td>{item.withinCap ? 'Yes' : 'No'}</Td>
                  <Td>{new Date(item.expiresAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ReturnAgeingSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getReturnNoteAgeing(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Return notes — ageing (BR-189)">
      <p className="mb-4 text-sm text-slate-500">
        30-day clock. Day 31 itself is still open (QR-021) — this only reports age, it does not
        decide what happens past it.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing outstanding.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Cases</Th>
                <Th>Days old</Th>
                <Th>Overdue</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.returnNoteId}>
                  <Td>{item.poId.slice(-6)}</Td>
                  <Td>{item.cases}</Td>
                  <Td>{item.daysOld}</Td>
                  <Td>
                    {item.overdue && (
                      <Badge tone="bad">
                        <FiFlag className="inline" /> Past 30 days
                      </Badge>
                    )}
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

// New — M7, BR-206. The seller-recovery half of a Controller-decided
// dispute: never the buyer, never the buyer's own note (that is Sales's
// complaint queue).
function SellerRecoverySection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSellerRecoveryQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Seller recovery — Controller-decided disputes (BR-206)">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing to recover.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Debit note</Th>
                <Th>Decided</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.complaintId}>
                  <Td>{item.sellerId.slice(-6)}</Td>
                  <Td>{item.debitNoteId ? item.debitNoteId.slice(-6) : '—'}</Td>
                  <Td>{item.decidedAt ? new Date(item.decidedAt).toLocaleDateString() : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
