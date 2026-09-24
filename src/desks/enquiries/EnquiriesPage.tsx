import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiPlus, FiPhoneCall, FiRefreshCw, FiSearch } from 'react-icons/fi';
import {
  createEnquiry,
  listEnquiries,
  type EnquiryKind,
  type EnquiryListItem,
  type EnquiryOutcome,
} from '../../api/enquiry';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { AsyncBoundary } from '../../components/AsyncBoundary';
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
import { PERMISSIONS } from '../../lib/permissions';
import { BuyerPicker, PackPicker, RequirementFields, SellerPicker } from './enquiryPickers';
import {
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  TRADE_STATUS_LABEL,
  WAITING_ON_LABEL,
  deskFor,
  productText,
  type Desk,
} from './enquiryLabels';

/**
 * Enquiry journey — every enquiry in one list, each with its number, where it
 * stands, who owns it and when it is next followed up. Each desk sees its own
 * side: Sales the buyer or prospect, Purchase the seller, Logistics neither,
 * the full view both. Opening a row shows its whole journey.
 */
export function EnquiriesPage() {
  const { callApi, hasPermission } = useAuth();
  const desk = deskFor(hasPermission);
  const [kind, setKind] = useState<EnquiryKind | ''>('');
  const [outcome, setOutcome] = useState<EnquiryOutcome | ''>('open');
  const [mine, setMine] = useState(false);
  const [followUpDue, setFollowUpDue] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const loader = useCallback(
    () =>
      callApi((token) =>
        listEnquiries(token, {
          kind: kind || undefined,
          outcome: outcome || undefined,
          mine,
          followUpDue,
          q: q || undefined,
          limit: 100,
        }),
      ),
    [callApi, kind, outcome, mine, followUpDue, q],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const worksADesk = desk !== 'logistics';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Enquiries</h1>
        {(hasPermission(PERMISSIONS.PROXY_BUYER_CALL) ||
          hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) && (
          <Button icon={<FiPlus />} onClick={() => setCreating(true)}>
            New enquiry
          </Button>
        )}
      </div>
      <DevNote screen="enquiries" />

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(search.trim());
            }}
          >
            <div className="w-44">
              <Input
                label="Enquiry no."
                placeholder="ENQ-26-00012"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" icon={<FiSearch />}>
              Find
            </Button>
          </form>
          <div className="w-40">
            <Select
              label="Type"
              value={kind}
              onChange={(e) => setKind(e.target.value as EnquiryKind | '')}
            >
              <option value="">All</option>
              <option value="pre_trade">Pre-trade</option>
              <option value="ask">Asks</option>
              <option value="pile_request">Listed rates taken</option>
            </Select>
          </div>
          <div className="w-36">
            <Select
              label="Show"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as EnquiryOutcome | '')}
            >
              <option value="open">Open</option>
              <option value="won">Ordered</option>
              <option value="lost">Lost</option>
              <option value="">Everything</option>
            </Select>
          </div>
          {worksADesk && (
            <div className="flex flex-col gap-1 pb-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={mine}
                  onChange={(e) => setMine(e.target.checked)}
                />
                Mine only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={followUpDue}
                  onChange={(e) => setFollowUpDue(e.target.checked)}
                />
                Follow-up due
              </label>
            </div>
          )}
          <Button variant="secondary" icon={<FiRefreshCw />} onClick={retry}>
            Refresh
          </Button>
        </div>

        <AsyncBoundary state={state} onRetry={retry} emptyMessage="No enquiries match.">
          {(items) => <EnquiryTable items={items} desk={desk} />}
        </AsyncBoundary>
      </Card>

      <NewEnquiryModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function partyText(item: EnquiryListItem, desk: Desk): string {
  const buyer =
    item.buyer?.firm ??
    (item.party !== 'seller' && item.prospect ? `${item.prospect.firm} (prospect)` : '—');
  const seller =
    item.seller?.firm ??
    (item.party === 'seller' && item.prospect
      ? `${item.prospect.firm} (prospect)`
      : item.kind === 'ask'
        ? 'Open board'
        : '—');
  if (desk === 'sales') return buyer;
  if (desk === 'purchase') return seller;
  if (desk === 'full') {
    // A pile request names both sides; a seller-party pre-trade enquiry has
    // no buyer at all — show whichever side(s) this enquiry actually has.
    if (item.buyer && (item.seller || item.kind === 'pile_request')) return `${buyer} ← ${seller}`;
    return item.party === 'seller' ? seller : buyer;
  }
  return '';
}

function ownerText(item: EnquiryListItem, desk: Desk): string {
  if (desk === 'sales') return item.owners.sales?.name ?? '—';
  if (desk === 'purchase') return item.owners.purchase?.name ?? '—';
  const both = [item.owners.sales?.name, item.owners.purchase?.name].filter(Boolean);
  return both.length ? both.join(' · ') : '—';
}

function FollowUpCell({ item, desk }: { item: EnquiryListItem; desk: Desk }) {
  const dates =
    desk === 'full'
      ? [item.followUp?.sales, item.followUp?.purchase]
      : [desk === 'sales' ? item.followUp?.sales : item.followUp?.purchase];
  const next = dates.filter((d): d is string => !!d).sort()[0];
  if (!next) return <>—</>;
  const overdue = new Date(next) <= new Date();
  return (
    <span className={overdue ? 'font-medium text-danger-600' : ''}>
      {new Date(next).toLocaleDateString()}
    </span>
  );
}

function EnquiryTable({ items, desk }: { items: EnquiryListItem[]; desk: Desk }) {
  const navigate = useNavigate();
  const partyHeader =
    desk === 'sales'
      ? 'Buyer'
      : desk === 'purchase'
        ? 'Seller'
        : desk === 'full'
          ? 'Buyer ← seller'
          : null;
  const worksADesk = desk !== 'logistics';

  return (
    <Table>
      <thead>
        <tr>
          <Th>No.</Th>
          <Th>Raised</Th>
          <Th>Type</Th>
          <Th>Product</Th>
          <Th>Boxes</Th>
          {partyHeader && <Th>{partyHeader}</Th>}
          <Th>Status</Th>
          <Th>Owner</Th>
          {worksADesk && <Th>Follow-up</Th>}
          <Th />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => navigate(`/enquiries/${item.id}`)}
          >
            <Td>
              <span className="font-medium text-slate-900">{item.enquiryNo}</span>
            </Td>
            <Td>{new Date(item.raisedAt).toLocaleDateString()}</Td>
            <Td>
              {KIND_LABEL[item.kind]}
              {item.channel === 'sales_call' && (
                <FiPhoneCall className="ml-1 inline text-slate-400" aria-label="Sales call" />
              )}
            </Td>
            <Td>{productText(item)}</Td>
            <Td>{item.qty}</Td>
            {partyHeader && <Td>{partyText(item, desk)}</Td>}
            <Td>
              <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              {item.tradeStatus && (
                <span className="ml-2 text-xs text-slate-500">
                  {TRADE_STATUS_LABEL[item.tradeStatus]}
                </span>
              )}
              {item.waitingOn && (
                <span className="ml-2 text-xs text-slate-500">
                  · {WAITING_ON_LABEL[item.waitingOn]}
                </span>
              )}
            </Td>
            <Td>{ownerText(item, desk)}</Td>
            {worksADesk && (
              <Td>
                <FollowUpCell item={item} desk={desk} />
              </Td>
            )}
            <Td>
              <Button
                size="sm"
                variant="ghost"
                icon={<FiEye />}
                aria-label={`View details — ${item.enquiryNo}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/enquiries/${item.id}`);
                }}
              >
                View
              </Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/**
 * "New enquiry" — API-212. A registered buyer asking for a catalogue pack is
 * raised straight away as an ask (the same `raiseAsk` the buyer's own screen
 * uses). Everything else — a prospect not yet registered on either side, a
 * product not in the catalogue, or a seller enquiry at all — is logged as a
 * pre-trade enquiry (DEC-052), to convert (buyer) or mark listed (seller)
 * once ready. No price field exists here at all (BR-121).
 */
function NewEnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { callApi, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canBuyer = hasPermission(PERMISSIONS.PROXY_BUYER_CALL);
  const canSeller = hasPermission(PERMISSIONS.PROXY_SELLER_CALL);
  const [party, setParty] = useState<'buyer' | 'seller'>(canBuyer ? 'buyer' : 'seller');
  const [registered, setRegistered] = useState(true);
  const [what, setWhat] = useState<'catalogue' | 'text'>('catalogue');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [prospectFirm, setProspectFirm] = useState('');
  const [contactName, setContactName] = useState('');
  const [mobile, setMobile] = useState('');
  const [place, setPlace] = useState('');
  const [skuId, setSkuId] = useState('');
  const [productTextValue, setProductTextValue] = useState('');
  const [qty, setQty] = useState(1);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [deliveryBand, setDeliveryBand] = useState<'' | '48h' | '2-5d'>('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAsk = party === 'buyer' && registered && what === 'catalogue';
  const ready =
    (registered ? !!counterpartyId : !!prospectFirm.trim()) &&
    (what === 'catalogue' ? !!skuId : !!productTextValue.trim()) &&
    !!callNote.trim();

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { enquiryId } = await callApi((token) =>
        createEnquiry(token, {
          party,
          ...(registered
            ? party === 'buyer'
              ? { buyerCounterpartyId: counterpartyId }
              : { sellerCounterpartyId: counterpartyId }
            : {
                prospect: {
                  firm: prospectFirm.trim(),
                  ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
                  ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
                  ...(place.trim() ? { place: place.trim() } : {}),
                },
              }),
          ...(what === 'catalogue' ? { skuId } : { productText: productTextValue.trim() }),
          qty,
          conditionRequirement: { expiryBand, ...(deliveryBand ? { deliveryBand } : {}) },
          callNote,
        }),
      );
      onClose();
      navigate(`/enquiries/${enquiryId}`);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not log this enquiry.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New enquiry — log a call" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {canBuyer && canSeller ? (
            <Select
              label="Buyer or seller"
              value={party}
              onChange={(e) => setParty(e.target.value as typeof party)}
            >
              <option value="buyer">Buyer wants to buy</option>
              <option value="seller">Seller wants to supply</option>
            </Select>
          ) : (
            <p className="self-end pb-2 text-sm text-slate-600">
              {party === 'buyer' ? 'A buyer wants to buy.' : 'A seller wants to supply.'}
            </p>
          )}
          <Select
            label="Registered?"
            value={registered ? 'yes' : 'no'}
            onChange={(e) => setRegistered(e.target.value === 'yes')}
          >
            <option value="yes">Already registered</option>
            <option value="no">Not registered yet</option>
          </Select>
        </div>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {isAsk
            ? 'Raised straight away as an ask — sellers can quote on it. No price is asked for (BR-121).'
            : party === 'buyer'
              ? 'Logged as a pre-trade enquiry. Convert it to an ask once the buyer is registered and the product is in the catalogue.'
              : 'Logged as a pre-trade enquiry. Mark it listed once you have made him a listing on the Purchase desk.'}
        </p>

        {registered ? (
          party === 'buyer' ? (
            <BuyerPicker onChange={setCounterpartyId} />
          ) : (
            <SellerPicker onChange={setCounterpartyId} />
          )
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Firm"
              value={prospectFirm}
              onChange={(e) => setProspectFirm(e.target.value)}
              required
            />
            <Input
              label="Contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="Place" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        )}

        <Select
          label="Product"
          value={what}
          onChange={(e) => setWhat(e.target.value as typeof what)}
        >
          <option value="catalogue">A catalogue pack</option>
          <option value="text">Not in the catalogue</option>
        </Select>
        {what === 'catalogue' ? (
          <PackPicker onChange={setSkuId} />
        ) : (
          <Input
            label="Product asked for"
            hint="Brand, technical and pack as described on the call."
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
          hint="Who called, what was asked — mandatory."
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
          <Button type="submit" loading={submitting} disabled={!ready} icon={<FiPhoneCall />}>
            {isAsk ? 'Raise ask' : 'Log enquiry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
