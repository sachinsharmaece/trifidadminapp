import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiEdit2,
  FiEdit3,
  FiPhoneCall,
  FiRefreshCw,
  FiRepeat,
  FiSliders,
  FiX,
} from 'react-icons/fi';
import {
  DROP_REASONS,
  addEnquiryNote,
  convertEnquiry,
  dropEnquiry,
  editEnquiry,
  getEnquiry,
  listEnquiryAssignees,
  markEnquiryListed,
  setEnquiryFollowUp,
  setEnquiryOwner,
  type DropReason,
  type EnquiryChain,
  type EnquiryDetail,
  type EnquiryPhase,
  type EnquiryQuote,
  type WorkDesk,
} from '../../api/enquiry';
import {
  proxyAcceptAskFill,
  proxyAcceptPromotion,
  proxyConfirmPile,
  proxyDeclineAsk,
  proxyDeclinePile,
  proxyRejectPromotion,
  proxyRequotePile,
} from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { ChainStrip } from '../../components/ChainStrip';
import { DevNote } from '../../components/dev/DevNote';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from '../../components/ui';
import { useAsyncData } from '../../lib/useAsyncData';
import { BuyerPicker, PackPicker, RequirementFields } from './enquiryPickers';
import {
  DROP_REASON_LABEL,
  KIND_LABEL,
  PHASES,
  STATUS_LABEL,
  STATUS_TONE,
  TRADE_STATUS_LABEL,
  WAITING_ON_LABEL,
  deskFor,
  nextStepFor,
  productText,
  rupees,
  timelineLabel,
  when,
  type Desk,
} from './enquiryLabels';

/**
 * One enquiry, start to finish: what was asked, every response, the order(s)
 * it became with their six-stage chain strips (BR-031), and one timeline
 * across all of it. The actions offered are the ones the server says this
 * desk may take right now; each goes through the existing staff proxy
 * endpoint and carries a mandatory call note.
 */
export function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { callApi, hasPermission } = useAuth();
  const desk = deskFor(hasPermission);

  const loader = useCallback(() => callApi((token) => getEnquiry(token, id!)), [callApi, id]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/enquiries"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <FiArrowLeft aria-hidden /> All enquiries
        </Link>
        <Button variant="secondary" size="sm" icon={<FiRefreshCw />} onClick={retry}>
          Refresh
        </Button>
      </div>
      <DevNote screen="enquiry_detail" />
      <AsyncBoundary state={state} onRetry={retry}>
        {(enquiry) => <EnquiryJourney enquiry={enquiry} desk={desk} onChanged={retry} />}
      </AsyncBoundary>
    </div>
  );
}

const STATUS_FLOW_ACTIONS = [
  'accept_fill',
  'walk_away',
  'convert_to_ask',
  'mark_listed',
  'drop',
  'confirm_pile',
  'requote_pile',
  'decline_pile',
] as const;

function EnquiryJourney({
  enquiry,
  desk,
  onChanged,
}: {
  enquiry: EnquiryDetail;
  desk: Desk;
  onChanged: () => void;
}) {
  const nextStep = nextStepFor(desk, enquiry.status, enquiry.party);
  const [managingStatus, setManagingStatus] = useState(false);
  const [editing, setEditing] = useState(false);
  const canManageStatus = STATUS_FLOW_ACTIONS.some((a) => enquiry.actions.includes(a));
  const canEdit = enquiry.actions.includes('edit');

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                <span className="font-semibold text-slate-700">{enquiry.enquiryNo}</span> ·{' '}
                {KIND_LABEL[enquiry.kind]} · raised {when(enquiry.raisedAt)}
                {enquiry.channel === 'sales_call' &&
                  ` · on a Sales call${enquiry.raisedBy ? ` by ${enquiry.raisedBy}` : ''}`}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">
                {productText(enquiry)} — {enquiry.qty} boxes
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[enquiry.status]}>{STATUS_LABEL[enquiry.status]}</Badge>
              {enquiry.tradeStatus && (
                <span className="text-sm text-slate-500">
                  trade {TRADE_STATUS_LABEL[enquiry.tradeStatus]}
                  {enquiry.tradeWaitingOn === 'buyer' && ' · waiting on the buyer'}
                </span>
              )}
              {enquiry.dropReason && (
                <span className="text-sm text-slate-500">
                  {DROP_REASON_LABEL[enquiry.dropReason]}
                </span>
              )}
              {enquiry.waitingOn && (
                <span className="text-sm text-slate-500">
                  waiting on {WAITING_ON_LABEL[enquiry.waitingOn].toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <PhaseStrip phase={enquiry.phase} lost={enquiry.outcome === 'lost'} />
          {nextStep && (
            <p className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-slate-700">
              {nextStep}
            </p>
          )}
          <Parties enquiry={enquiry} />
          {(canEdit || canManageStatus) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {canEdit && (
                <Button variant="secondary" icon={<FiEdit2 />} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              {canManageStatus && (
                <Button icon={<FiSliders />} onClick={() => setManagingStatus(true)}>
                  Manage status
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {enquiry.actions.includes('manage') && (
        <WorkPanel enquiry={enquiry} desk={desk} onChanged={onChanged} />
      )}
      {enquiry.kind === 'pre_trade' && <PreTradeSection enquiry={enquiry} />}
      {enquiry.kind === 'ask' && <AskSection enquiry={enquiry} />}
      {enquiry.kind === 'pile_request' && <PileSection enquiry={enquiry} />}

      <Card title={`Orders (${enquiry.chains.length})`}>
        {enquiry.chains.length === 0 ? (
          <p className="text-sm text-slate-500">
            No order yet. An order — and its six-stage chain — appears here the moment the seller
            accepts.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {enquiry.chains.map((chain) => (
              <ChainCard
                key={chain.chainId}
                chain={chain}
                enquiry={enquiry}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Timeline">
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>What</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody>
            {enquiry.timeline.map((entry, index) => (
              <tr key={index}>
                <Td>{when(entry.at)}</Td>
                <Td>
                  {timelineLabel(entry.type)}
                  {entry.qty !== undefined && ` · ${entry.qty} boxes`}
                  {entry.chainNo && (
                    <span className="ml-2 text-xs text-slate-500">{entry.chainNo}</span>
                  )}
                </Td>
                <Td>{entry.callNote ?? ''}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {canEdit && (
        <EditEnquiryModal
          enquiry={enquiry}
          open={editing}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
        />
      )}
      {canManageStatus && (
        <ManageStatusModal
          enquiry={enquiry}
          open={managingStatus}
          onClose={() => setManagingStatus(false)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function PhaseStrip({ phase, lost }: { phase: EnquiryPhase; lost: boolean }) {
  const currentIndex = PHASES.findIndex((p) => p.key === phase);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {PHASES.map((p, index) => (
        <li key={p.key} className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              index < currentIndex
                ? 'bg-success-50 text-success-600'
                : index === currentIndex
                  ? lost
                    ? 'bg-slate-500 text-white'
                    : 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {p.label}
          </span>
          {index < PHASES.length - 1 && <span className="text-slate-300">→</span>}
        </li>
      ))}
    </ol>
  );
}

function Parties({ enquiry }: { enquiry: EnquiryDetail }) {
  if (!enquiry.buyer && !enquiry.seller && !enquiry.prospect) return null;
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      {enquiry.prospect && !enquiry.buyer && (
        <div>
          <dt className="text-slate-500">
            {enquiry.party === 'seller' ? 'Seller' : 'Buyer'} prospect (not registered)
          </dt>
          <dd className="font-medium text-slate-900">{enquiry.prospect.firm}</dd>
          <dd className="text-xs text-slate-500">
            {[enquiry.prospect.contactName, enquiry.prospect.mobile, enquiry.prospect.place]
              .filter(Boolean)
              .join(' · ') || '—'}
          </dd>
        </div>
      )}
      {enquiry.buyer && (
        <div>
          <dt className="text-slate-500">Buyer</dt>
          <dd className="font-medium text-slate-900">{enquiry.buyer.firm ?? '—'}</dd>
          <dd className="text-xs text-slate-400">{enquiry.buyer.counterpartyId}</dd>
        </div>
      )}
      {enquiry.seller && (
        <div>
          <dt className="text-slate-500">Seller</dt>
          <dd className="font-medium text-slate-900">{enquiry.seller.firm ?? '—'}</dd>
          <dd className="text-xs text-slate-400">{enquiry.seller.counterpartyId}</dd>
        </div>
      )}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Ask — requirement, quotes, and the Sales actions on a buyer call
// ---------------------------------------------------------------------------

function AskSection({ enquiry }: { enquiry: EnquiryDetail }) {
  const quotes = enquiry.quotes ?? [];
  const showsBuyerRate = quotes.some((q) => q.buyerRatePaise !== undefined);
  const showsSellerRate = quotes.some((q) => q.ratePaiseForIndore !== undefined);
  const showsSeller = quotes.some((q) => q.seller !== undefined);

  return (
    <Card title={`Quotes (${quotes.length})`}>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Expiry wanted</dt>
          <dd>
            {enquiry.requirement?.expiryBand === 'under12' ? 'Under 12 months' : 'Over 12 months'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Delivery wanted</dt>
          <dd>{enquiry.requirement?.deliveryBand ?? 'Any'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Open to all sellers</dt>
          <dd>{when(enquiry.visibleToAllAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Buyer hold ends</dt>
          <dd>{when(enquiry.holdExpiresAt)}</dd>
        </div>
      </dl>

      {quotes.length === 0 ? (
        <p className="text-sm text-slate-500">No quote yet. Expires {when(enquiry.ttlAt)}.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              {showsSeller && <Th>Seller</Th>}
              <Th>Boxes</Th>
              <Th>Expiry · delivery</Th>
              <Th>Days to Indore</Th>
              {showsSellerRate && <Th>Seller rate</Th>}
              {showsBuyerRate && <Th>Buyer rate</Th>}
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <QuoteRow
                key={quote.quoteId}
                quote={quote}
                showsSeller={showsSeller}
                showsSellerRate={showsSellerRate}
                showsBuyerRate={showsBuyerRate}
              />
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function QuoteRow({
  quote,
  showsSeller,
  showsSellerRate,
  showsBuyerRate,
}: {
  quote: EnquiryQuote;
  showsSeller: boolean;
  showsSellerRate: boolean;
  showsBuyerRate: boolean;
}) {
  const statusText =
    quote.rank !== undefined && quote.ofCount
      ? `${quote.status} · ${quote.rank} of ${quote.ofCount}`
      : quote.status;
  return (
    <tr>
      {showsSeller && <Td>{quote.seller?.firm ?? '—'}</Td>}
      <Td>
        {quote.qtyAvailable}
        {quote.gapCodes.length > 0 && (
          <span className="ml-2 text-xs text-warning-600">
            {quote.gapCodes.map((g) => g.replaceAll('_', ' ')).join(', ')}
          </span>
        )}
      </Td>
      <Td>
        {quote.expiryBand ?? '—'}
        {quote.expiryExact && ` (${quote.expiryExact})`} · {quote.deliveryBand ?? '—'}
      </Td>
      <Td>{quote.daysToIndore}</Td>
      {showsSellerRate && <Td>{rupees(quote.ratePaiseForIndore)}</Td>}
      {showsBuyerRate && (
        <Td>
          {quote.buyerRatePaise === null ? 'Not priceable yet' : rupees(quote.buyerRatePaise)}
        </Td>
      )}
      <Td>
        <Badge tone={quote.status === 'won' ? 'good' : quote.status === 'live' ? 'neutral' : 'bad'}>
          {statusText}
        </Badge>
      </Td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Listed rate — the pile and the line (read-only; actions in ManageStatusModal)
// ---------------------------------------------------------------------------

function PileSection({ enquiry }: { enquiry: EnquiryDetail }) {
  const pile = enquiry.pile!;
  const line = enquiry.line;

  return (
    <Card title="The pile">
      <p className="mb-4 text-sm text-slate-500">
        Every buyer taking this listed line joins one pile; the seller makes one decision for all of
        them (WF-05). Requests are shown the way the seller sees them — index, boxes and time only.
      </p>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Decision</dt>
          <dd>{pile.decision ?? 'Not yet'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Asked · confirmed</dt>
          <dd>
            {pile.askedQty} · {pile.confirmedQty ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Desk chase from</dt>
          <dd>{when(pile.confirmWindowEndsAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Seller locked until</dt>
          <dd>{when(pile.sellerLockedUntil)}</dd>
        </div>
        {line && (
          <>
            <div>
              <dt className="text-slate-500">Line conditions</dt>
              <dd>
                {line.expiryBand} · {line.deliveryBand} · {line.provenance}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">MOQ</dt>
              <dd>{line.moqExact}</dd>
            </div>
            {line.ratePaise !== undefined && (
              <div>
                <dt className="text-slate-500">Seller rate · left on line</dt>
                <dd>
                  {rupees(line.ratePaise)} · {line.qtyLeft ?? '—'}
                </dd>
              </div>
            )}
            {line.buyerRatePaise !== undefined && (
              <div>
                <dt className="text-slate-500">Buyer rate</dt>
                <dd>
                  {line.buyerRatePaise === null ? 'Not priceable yet' : rupees(line.buyerRatePaise)}
                </dd>
              </div>
            )}
          </>
        )}
      </dl>

      <Table>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Boxes</Th>
            <Th>Requested</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {pile.requests.map((request) => (
            <tr key={request.index}>
              <Td>{request.index}</Td>
              <Td>{request.boxes}</Td>
              <Td>{when(request.time)}</Td>
              <Td>{request.isThis && <Badge>This enquiry</Badge>}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Orders — each chain the enquiry became
// ---------------------------------------------------------------------------

function ChainCard({
  chain,
  enquiry,
  onChanged,
}: {
  chain: EnquiryChain;
  enquiry: EnquiryDetail;
  onChanged: () => void;
}) {
  const { view } = chain;
  const offersPromotion =
    enquiry.actions.includes('promotion_decision') &&
    view.so?.state === 'promotion_offered' &&
    chain.soId &&
    enquiry.buyer;

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-900">{view.chainNo}</span>
        <span className="text-slate-500">
          {chain.source === 'listed' ? 'from a listed rate' : 'from an ask'}
        </span>
      </div>
      <ChainStrip currentStage={view.stage} />
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {view.so && (
          <div>
            <dt className="text-slate-500">SO {view.so.soNo}</dt>
            <dd>
              {view.so.state.replaceAll('_', ' ')}
              {view.so.totalPaise !== undefined && ` · ${rupees(view.so.totalPaise)}`}
              {view.so.payDeadline && ` · pay by ${when(view.so.payDeadline)}`}
            </dd>
          </div>
        )}
        {view.po && (
          <div>
            <dt className="text-slate-500">PO {view.po.poNo}</dt>
            <dd>
              {view.po.state.replaceAll('_', ' ')} · dispatch due {when(view.po.dispatchDueDate)}
            </dd>
          </div>
        )}
      </dl>
      {offersPromotion && (
        <PromotionActions
          soId={chain.soId!}
          buyerCounterpartyId={enquiry.buyer!.counterpartyId}
          onDone={onChanged}
        />
      )}
    </div>
  );
}

function PromotionActions({
  soId,
  buyerCounterpartyId,
  onDone,
}: {
  soId: string;
  buyerCounterpartyId: string;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      onDone();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : 'Could not record this.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3">
      <p className="text-sm text-slate-700">
        The original seller failed to supply; a replacement is on offer (WF-11). Record the
        buyer&apos;s decision from the call.
      </p>
      <Textarea
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
      <div className="flex gap-2">
        <Button
          size="sm"
          icon={<FiPhoneCall />}
          loading={submitting}
          disabled={!callNote}
          onClick={() =>
            void run(() =>
              callApi((token) =>
                proxyAcceptPromotion(token, soId, { buyerCounterpartyId, callNote }),
              ),
            )
          }
        >
          Accept replacement
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<FiX />}
          loading={submitting}
          disabled={!callNote}
          onClick={() =>
            void run(() =>
              callApi((token) =>
                proxyRejectPromotion(token, soId, { buyerCounterpartyId, callNote }),
              ),
            )
          }
        >
          Decline — full refund
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-trade (DEC-052) — informational; edit/convert/drop live in their modals
// ---------------------------------------------------------------------------

function PreTradeSection({ enquiry }: { enquiry: EnquiryDetail }) {
  return (
    <Card title="Pre-trade">
      <p className="text-sm text-slate-500">
        {enquiry.party === 'seller' ? 'A seller lead' : 'A buyer lead'}, logged before it could
        become a trade (DEC-052).{' '}
        {enquiry.productText && (
          <>
            Asked for: <strong>{enquiry.productText}</strong>.{' '}
          </>
        )}
        Use <strong>Edit</strong> above to fix a quantity or requirement, or{' '}
        <strong>Manage status</strong> to{' '}
        {enquiry.party === 'seller'
          ? 'mark it listed once you have made him a listing, or drop it'
          : 'convert it to an ask once the buyer is registered and the product is in the catalogue, or drop it'}
        — this keeps the same enquiry number, owners and notes.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Owner, follow-up, notes — each desk works its own half (DEC-051)
// ---------------------------------------------------------------------------

function WorkPanel({
  enquiry,
  desk,
  onChanged,
}: {
  enquiry: EnquiryDetail;
  desk: Desk;
  onChanged: () => void;
}) {
  // Sales and Purchase work their own half; the full view (Controller, Admin) either.
  const desks: WorkDesk[] =
    desk === 'sales' ? ['sales'] : desk === 'purchase' ? ['purchase'] : ['sales', 'purchase'];

  return (
    <Card title="Work on this enquiry">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {desks.map((d) => (
          <DeskHalf
            key={d}
            enquiry={enquiry}
            workDesk={d}
            explicitDesk={desk === 'full'}
            onChanged={onChanged}
          />
        ))}
      </div>
      <Notes enquiry={enquiry} onChanged={onChanged} />
    </Card>
  );
}

/** An ISO instant as the `datetime-local` input's own local-time value. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function DeskHalf({
  enquiry,
  workDesk,
  explicitDesk,
  onChanged,
}: {
  enquiry: EnquiryDetail;
  workDesk: WorkDesk;
  explicitDesk: boolean;
  onChanged: () => void;
}) {
  const { callApi, me } = useAuth();
  const [assignees, setAssignees] = useState<Array<{ employeeId: string; name: string }>>([]);
  const owner = enquiry.owners[workDesk];
  const followUp = enquiry.followUp?.[workDesk] ?? null;
  const [followUpAt, setFollowUpAt] = useState(followUp ? toLocalInput(followUp) : '');
  const [error, setError] = useState<string | null>(null);
  const deskBody = explicitDesk ? { desk: workDesk } : {};

  useEffect(() => {
    void callApi((token) => listEnquiryAssignees(token, workDesk))
      .then(setAssignees)
      .catch(() => setAssignees([]));
  }, [callApi, workDesk]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : 'Could not save.');
    }
  }

  const myId = me?.employeeId;
  const iAmEligible = assignees.some((a) => a.employeeId === myId);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold capitalize text-slate-900">{workDesk}</h3>
      <Select
        label="Owner"
        value={owner?.employeeId ?? ''}
        onChange={(e) =>
          void run(() =>
            callApi((token) =>
              setEnquiryOwner(token, enquiry.id, {
                ...deskBody,
                employeeId: e.target.value || null,
              }),
            ),
          )
        }
      >
        <option value="">Unassigned</option>
        {owner && !assignees.some((a) => a.employeeId === owner.employeeId) && (
          <option value={owner.employeeId}>{owner.name}</option>
        )}
        {assignees.map((a) => (
          <option key={a.employeeId} value={a.employeeId}>
            {a.name}
          </option>
        ))}
      </Select>
      {iAmEligible && owner?.employeeId !== myId && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void run(() =>
              callApi((token) =>
                setEnquiryOwner(token, enquiry.id, { ...deskBody, employeeId: myId! }),
              ),
            )
          }
        >
          Assign to me
        </Button>
      )}
      <div className="flex items-end gap-2">
        <Input
          label="Next follow-up"
          type="datetime-local"
          value={followUpAt}
          onChange={(e) => setFollowUpAt(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void run(() =>
              callApi((token) =>
                setEnquiryFollowUp(token, enquiry.id, {
                  ...deskBody,
                  at: followUpAt ? new Date(followUpAt).toISOString() : null,
                }),
              ),
            )
          }
        >
          {followUpAt ? 'Set' : 'Clear'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}

function Notes({ enquiry, onChanged }: { enquiry: EnquiryDetail; onChanged: () => void }) {
  const { callApi } = useAuth();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const notes = enquiry.notes ?? [];

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">Notes</h3>
      <p className="mb-3 text-xs text-slate-500">
        Read only by your own desk (and management) — a note may name a buyer or a seller.
      </p>
      {notes.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {notes.map((note, index) => (
            <li key={index} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              <p className="text-slate-800">{note.text}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.author} · {note.desk} · {when(note.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex max-w-xl flex-col gap-2">
        <Textarea label="Add a note" value={text} onChange={(e) => setText(e.target.value)} />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <div>
          <Button
            size="sm"
            loading={submitting}
            disabled={!text.trim()}
            onClick={() => {
              setSubmitting(true);
              setError(null);
              void callApi((token) => addEnquiryNote(token, enquiry.id, text.trim()))
                .then(() => {
                  setText('');
                  onChanged();
                })
                .catch((noteError: unknown) =>
                  setError(noteError instanceof ApiError ? noteError.message : 'Could not save.'),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            Add note
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit — API-219, pre-trade only. The still-draft fields: qty, requirement,
// and whichever of prospect/productText this enquiry has. Identity (buyer,
// catalogue pack) is not editable here — that is what "Manage status" → convert does.
// ---------------------------------------------------------------------------

function EditEnquiryModal({
  enquiry,
  open,
  onClose,
  onChanged,
}: {
  enquiry: EnquiryDetail;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { callApi } = useAuth();
  const [qty, setQty] = useState(enquiry.qty);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>(
    enquiry.requirement?.expiryBand === 'under12' ? 'under12' : 'over12',
  );
  const [deliveryBand, setDeliveryBand] = useState<'' | '48h' | '2-5d'>(
    (enquiry.requirement?.deliveryBand as '48h' | '2-5d' | null) ?? '',
  );
  const [firm, setFirm] = useState(enquiry.prospect?.firm ?? '');
  const [contactName, setContactName] = useState(enquiry.prospect?.contactName ?? '');
  const [mobile, setMobile] = useState(enquiry.prospect?.mobile ?? '');
  const [place, setPlace] = useState(enquiry.prospect?.place ?? '');
  const [productTextValue, setProductTextValue] = useState(enquiry.productText ?? '');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isProspect = !!enquiry.prospect;
  const isFreeText = !enquiry.product;

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        editEnquiry(token, enquiry.id, {
          qty,
          conditionRequirement: { expiryBand, ...(deliveryBand ? { deliveryBand } : {}) },
          ...(isProspect
            ? {
                prospect: {
                  firm: firm.trim(),
                  ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
                  ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
                  ...(place.trim() ? { place: place.trim() } : {}),
                },
              }
            : {}),
          ...(isFreeText ? { productText: productTextValue.trim() } : {}),
          callNote,
        }),
      );
      setCallNote('');
      onChanged();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not save these changes.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={`Edit — ${enquiry.enquiryNo}`} onClose={onClose}>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        {isProspect && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Firm" value={firm} onChange={(e) => setFirm(e.target.value)} required />
            <Input
              label="Contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="Place" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        )}
        {isFreeText && (
          <Input
            label="Product asked for"
            value={productTextValue}
            onChange={(e) => setProductTextValue(e.target.value)}
            required
          />
        )}
        <Input
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
        />
        <RequirementFields
          expiryBand={expiryBand}
          deliveryBand={deliveryBand}
          onExpiryBand={setExpiryBand}
          onDeliveryBand={setDeliveryBand}
        />
        <Textarea
          label="Call note"
          hint="Why this is changing — mandatory."
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={submitting}
            disabled={
              !callNote.trim() ||
              (isProspect && !firm.trim()) ||
              (isFreeText && !productTextValue.trim())
            }
            icon={<FiEdit2 />}
            onClick={() => void handleSubmit()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage status — one place for every status-changing action this desk may
// take right now, whichever kind of enquiry this is. Each still goes through
// its existing endpoint and carries its own mandatory call note.
// ---------------------------------------------------------------------------

function ManageStatusModal({
  enquiry,
  open,
  onClose,
  onChanged,
}: {
  enquiry: EnquiryDetail;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  function handleDone(): void {
    onChanged();
    onClose();
  }

  return (
    <Modal open={open} title={`Manage status — ${enquiry.enquiryNo}`} onClose={onClose}>
      <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          Current status:{' '}
          <Badge tone={STATUS_TONE[enquiry.status]}>{STATUS_LABEL[enquiry.status]}</Badge>
        </div>
        {enquiry.kind === 'pre_trade' && (
          <PreTradeStatusForm enquiry={enquiry} onDone={handleDone} />
        )}
        {enquiry.kind === 'ask' && <AskStatusForm enquiry={enquiry} onDone={handleDone} />}
        {enquiry.kind === 'pile_request' && (
          <PileStatusForm enquiry={enquiry} onDone={handleDone} />
        )}
      </div>
    </Modal>
  );
}

function PreTradeStatusForm({ enquiry, onDone }: { enquiry: EnquiryDetail; onDone: () => void }) {
  const { callApi } = useAuth();
  const canConvert = enquiry.actions.includes('convert_to_ask');
  const canMarkListed = enquiry.actions.includes('mark_listed');
  const canDrop = enquiry.actions.includes('drop');
  const knownBuyer = enquiry.buyer?.counterpartyId ?? null;
  const [buyerCounterpartyId, setBuyerCounterpartyId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(enquiry.qty);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>(
    enquiry.requirement?.expiryBand === 'under12' ? 'under12' : 'over12',
  );
  const [deliveryBand, setDeliveryBand] = useState<'' | '48h' | '2-5d'>(
    (enquiry.requirement?.deliveryBand as '48h' | '2-5d' | null) ?? '',
  );
  const [reason, setReason] = useState<DropReason>('buyer_lost_interest');
  const [callNote, setCallNote] = useState('');
  const [listedNote, setListedNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const effectiveBuyer = knownBuyer ?? buyerCounterpartyId;

  async function run(action: () => Promise<unknown>, failure: string): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      onDone();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : failure);
    } finally {
      setSubmitting(false);
    }
  }

  if (!canConvert && !canMarkListed && !canDrop) {
    return <p className="text-sm text-slate-500">No status action available right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {canConvert && (
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Convert to ask</h3>
          {knownBuyer ? (
            <p className="text-sm text-slate-700">
              Buyer: <strong>{enquiry.buyer?.firm ?? knownBuyer}</strong>
            </p>
          ) : (
            <BuyerPicker onChange={setBuyerCounterpartyId} />
          )}
          <PackPicker onChange={setSkuId} />
          <Input
            label="Quantity (boxes)"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <RequirementFields
            expiryBand={expiryBand}
            deliveryBand={deliveryBand}
            onExpiryBand={setExpiryBand}
            onDeliveryBand={setDeliveryBand}
          />
          <Textarea
            label="Call note"
            hint="What was agreed — mandatory."
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            required
          />
          <div>
            <Button
              icon={<FiRepeat />}
              loading={submitting}
              disabled={!effectiveBuyer || !skuId || !callNote}
              onClick={() =>
                void run(
                  () =>
                    callApi((token) =>
                      convertEnquiry(token, enquiry.id, {
                        buyerCounterpartyId: effectiveBuyer,
                        skuId,
                        qty,
                        conditionRequirement: {
                          expiryBand,
                          ...(deliveryBand ? { deliveryBand } : {}),
                        },
                        callNote,
                      }),
                    ),
                  'Could not convert this enquiry.',
                )
              }
            >
              Convert to ask
            </Button>
          </div>
        </div>
      )}
      {canMarkListed && (
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Mark listed</h3>
          <p className="text-sm text-slate-500">
            Once you have made {enquiry.seller?.firm ?? 'this seller'} a listing on the Purchase
            desk, mark this enquiry done. There is no automatic link to that listing.
          </p>
          <Textarea
            label="Call note"
            hint="What was agreed — mandatory."
            value={listedNote}
            onChange={(e) => setListedNote(e.target.value)}
            required
          />
          <div>
            <Button
              icon={<FiCheck />}
              loading={submitting}
              disabled={!listedNote}
              onClick={() =>
                void run(
                  () =>
                    callApi((token) =>
                      markEnquiryListed(token, enquiry.id, { callNote: listedNote }),
                    ),
                  'Could not mark this enquiry listed.',
                )
              }
            >
              Mark listed
            </Button>
          </div>
        </div>
      )}
      {canDrop && (
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Drop</h3>
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as DropReason)}
          >
            {DROP_REASONS.map((r) => (
              <option key={r} value={r}>
                {DROP_REASON_LABEL[r]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Call note"
            hint="What was agreed — mandatory."
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            required
          />
          <div>
            <Button
              variant="secondary"
              icon={<FiX />}
              loading={submitting}
              disabled={!callNote}
              onClick={() =>
                void run(
                  () => callApi((token) => dropEnquiry(token, enquiry.id, { reason, callNote })),
                  'Could not drop this enquiry.',
                )
              }
            >
              Drop
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}

function AskStatusForm({ enquiry, onDone }: { enquiry: EnquiryDetail; onDone: () => void }) {
  const { callApi } = useAuth();
  const canAccept = enquiry.actions.includes('accept_fill');
  const canWalkAway = enquiry.actions.includes('walk_away');
  const quotes = enquiry.quotes ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  const [option, setOption] = useState<'full' | 'partial'>('full');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(quoteId: string): void {
    setSelected((current) =>
      current.includes(quoteId)
        ? current.filter((idValue) => idValue !== quoteId)
        : [...current, quoteId],
    );
  }

  async function run(action: () => Promise<unknown>, failure: string): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      onDone();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : failure);
    } finally {
      setSubmitting(false);
    }
  }

  if ((!canAccept && !canWalkAway) || !enquiry.buyer) {
    return <p className="text-sm text-slate-500">No status action available right now.</p>;
  }
  const buyerCounterpartyId = enquiry.buyer.counterpartyId;

  return (
    <div className="flex flex-col gap-4">
      {canAccept && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Pick the quote(s) to accept</h3>
          {quotes.filter((q) => q.status === 'live').length === 0 ? (
            <p className="text-sm text-slate-500">No live quote to accept.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {quotes
                .filter((q) => q.status === 'live')
                .map((q) => (
                  <li key={q.quoteId}>
                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selected.includes(q.quoteId)}
                        onChange={() => toggle(q.quoteId)}
                      />
                      {q.qtyAvailable} boxes
                      {q.seller?.firm ? ` · ${q.seller.firm}` : ''}
                      {q.buyerRatePaise != null ? ` · ${rupees(q.buyerRatePaise)}` : ''}
                    </label>
                  </li>
                ))}
            </ul>
          )}
          <Select
            label="Option"
            value={option}
            onChange={(e) => setOption(e.target.value as typeof option)}
          >
            <option value="full">Full — the partial plus the balance</option>
            <option value="partial">Partial — the cheap portion alone</option>
          </Select>
        </div>
      )}
      <Textarea
        label="Call note"
        hint="What the buyer agreed to — mandatory."
        value={callNote}
        onChange={(e) => setCallNote(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <Button
            icon={<FiCheck />}
            loading={submitting}
            disabled={selected.length === 0 || !callNote}
            onClick={() =>
              void run(
                () =>
                  callApi((token) =>
                    proxyAcceptAskFill(token, enquiry.id, {
                      buyerCounterpartyId,
                      option,
                      quoteIds: selected,
                      callNote,
                    }),
                  ),
                'Could not accept these quotes.',
              )
            }
          >
            Accept {selected.length || ''} quote{selected.length === 1 ? '' : 's'}
          </Button>
        )}
        {canWalkAway && (
          <Button
            variant="secondary"
            icon={<FiX />}
            loading={submitting}
            disabled={!callNote}
            onClick={() =>
              void run(
                () =>
                  callApi((token) =>
                    proxyDeclineAsk(token, enquiry.id, { buyerCounterpartyId, callNote }),
                  ),
                'Could not withdraw this ask.',
              )
            }
          >
            Walk away (free, no strike)
          </Button>
        )}
      </div>
    </div>
  );
}

function PileStatusForm({ enquiry, onDone }: { enquiry: EnquiryDetail; onDone: () => void }) {
  const { callApi } = useAuth();
  const canDecide = enquiry.actions.includes('confirm_pile');
  const pile = enquiry.pile;
  const line = enquiry.line;
  const [canSendBoxes, setCanSendBoxes] = useState(pile?.askedQty ?? 0);
  const [expiryExact, setExpiryExact] = useState('');
  const [batch, setBatch] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(
    action: () => Promise<unknown>,
    success: string,
    failure: string,
    closeAfterMs = 0,
  ) {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await action();
      setMessage(success);
      // A confirm fans out 5 seconds later (BR-137) — close once it has.
      window.setTimeout(onDone, closeAfterMs);
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : failure);
    } finally {
      setSubmitting(false);
    }
  }

  if (!canDecide || !enquiry.seller || !line || !pile) {
    return <p className="text-sm text-slate-500">No status action available right now.</p>;
  }
  const sellerCounterpartyId = enquiry.seller.counterpartyId;
  const needsBatch = line.provenance === 'auth';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Can send (boxes)"
          type="number"
          min={0}
          value={canSendBoxes}
          onChange={(e) => setCanSendBoxes(Number(e.target.value))}
        />
        <Input
          label="Exact expiry (MM/YYYY)"
          hint="Required to confirm (BR-102)."
          placeholder="06/2028"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        {needsBatch && (
          <Input
            label="Batch"
            hint="Required for My stock (BR-105)."
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
        )}
      </div>
      <Textarea
        label="Call note"
        hint="What the seller said — mandatory."
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
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<FiCheck />}
          loading={submitting}
          disabled={!callNote || !expiryExact || (needsBatch && !batch)}
          onClick={() =>
            void run(
              () =>
                callApi((token) =>
                  proxyConfirmPile(token, pile.pileId, {
                    sellerCounterpartyId,
                    canSendBoxes,
                    expiryExact,
                    ...(needsBatch ? { batch } : {}),
                    callNote,
                  }),
                ),
              'Confirmed — the order(s) are raised in about five seconds.',
              'Could not confirm this pile.',
              6000,
            )
          }
        >
          Confirm supply
        </Button>
        <Button
          variant="secondary"
          icon={<FiEdit3 />}
          loading={submitting}
          disabled={!callNote}
          onClick={() =>
            void run(
              () =>
                callApi((token) =>
                  proxyRequotePile(token, pile.pileId, { sellerCounterpartyId, callNote }),
                ),
              'Requoted.',
              'Could not requote.',
            )
          }
        >
          Requote
        </Button>
        <Button
          variant="secondary"
          icon={<FiX />}
          loading={submitting}
          disabled={!callNote}
          onClick={() =>
            void run(
              () =>
                callApi((token) =>
                  proxyDeclinePile(token, pile.pileId, { sellerCounterpartyId, callNote }),
                ),
              'Declined — free before payment.',
              'Could not decline.',
            )
          }
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
