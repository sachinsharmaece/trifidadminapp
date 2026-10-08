import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiFlag } from 'react-icons/fi';
import {
  getActiveDemandList,
  getAskSellerStates,
  postAskChase,
  postNonOrderReason,
  type ActiveDemandItem,
  type AskSellerStateItem,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { ApiError } from '../../api/errors';
import { proxyPostQuote } from '../../api/proxy';
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

export function DemandPage() {
  const { callApi } = useAuth();
  const [noSellerOnly, setNoSellerOnly] = useState(false);
  const loader = useCallback(
    () => callApi((token) => getActiveDemandList(token, noSellerOnly)),
    [callApi, noSellerOnly],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_demand" />
      <Card title="Active demand">
        <p className="mb-4 text-sm text-slate-500">
          BR-272 — how many sellers are quoted, active, dormant or dark against each open ask. No
          buyer identity, and open interest here is boxes only, never a rupee figure (BR-069) — a
          seller's own rate still shows when you open a row (BR-066), that&apos;s not what BR-069
          governs.
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
                  <Th numeric>Boxes</Th>
                  <Th numeric>Quoted</Th>
                  <Th numeric>Listed</Th>
                  <Th numeric>Dormant</Th>
                  <Th>No seller</Th>
                  <Th />
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <DemandRow key={item.askId} item={item} onRecorded={retry} />
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

function DemandRow({ item, onRecorded }: { item: ActiveDemandItem; onRecorded: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <Td>
          {open ? '▾ ' : '▸ '}
          {item.brand} · {item.technical}
        </Td>
        <Td numeric>{item.qty}</Td>
        <Td numeric>{item.sellerCounts.quoted}</Td>
        <Td numeric>{item.sellerCounts.active}</Td>
        <Td numeric>{item.sellerCounts.dormant}</Td>
        <Td>
          {item.noSeller && (
            <div className="flex items-center gap-2">
              <Badge tone="warn">
                <FiFlag className="inline" /> No seller
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase/matrix?q=${encodeURIComponent(item.technical)}`);
                }}
              >
                Who could carry it →
              </Button>
            </div>
          )}
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <NonOrderReasonForm askId={item.askId} onRecorded={onRecorded} />
        </Td>
        <Td />
      </tr>
      {open && (
        <tr>
          <Td colSpan={8}>
            <QuoteGapsDetail askId={item.askId} />
          </Td>
        </tr>
      )}
    </>
  );
}

const SELLER_STATE_LABEL: Record<
  AskSellerStateItem['state'],
  { label: string; tone: 'good' | 'neutral' | 'warn' }
> = {
  quoted: { label: 'Quoted', tone: 'good' },
  listed: { label: 'Listed, silent', tone: 'neutral' },
  carries: { label: 'Carries it, not listed', tone: 'warn' },
};

function QuoteGapsDetail({ askId }: { askId: string }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getAskSellerStates(token, askId)),
    [callApi, askId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary
      state={state}
      onRetry={retry}
      emptyMessage="No seller in the catalogue carries this — a recruiting brief, not a leak."
    >
      {(sellers: AskSellerStateItem[]) => (
        <ul className="flex flex-col gap-1 py-2 pl-6 text-sm">
          {sellers.map((s) => (
            <SellerStateRow key={s.sellerId} askId={askId} seller={s} onQuoted={retry} />
          ))}
        </ul>
      )}
    </AsyncBoundary>
  );
}

function SellerStateRow({
  askId,
  seller: s,
  onQuoted,
}: {
  askId: string;
  seller: AskSellerStateItem;
  onQuoted: () => void;
}) {
  const { callApi, hasPermission } = useAuth();
  const [chased, setChased] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const { label, tone } = SELLER_STATE_LABEL[s.state];
  // The party ledger sits behind chain:read_full (Accounts, Controller, Founder, Admin) —
  // Purchase doesn't hold it, so it gets the seller file link only, never a dead one.
  const canSeeLedger = hasPermission(PERMISSIONS.CHAIN_READ_FULL);
  return (
    <li className="flex flex-wrap items-center gap-2">
      <Link
        to={`/purchase/sellers/${s.sellerId}`}
        className="font-medium text-slate-800 underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {s.firm}
      </Link>
      <Badge tone={tone}>{label}</Badge>
      {s.ratePaise !== null && (
        <span className="text-slate-500">₹{(s.ratePaise / 100).toFixed(2)}</span>
      )}
      {s.gapCodes.length > 0 && (
        <span className="text-danger-500">short: {s.gapCodes.join(', ').replaceAll('_', ' ')}</span>
      )}
      {canSeeLedger && (
        <Link
          to={`/accounts/party/${s.sellerId}`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Ledger →
        </Link>
      )}
      {s.state !== 'quoted' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void callApi((token) => postAskChase(token, askId, s.sellerId)).then(() =>
              setChased(true),
            )
          }
        >
          {chased ? 'Chased' : 'Chase'}
        </Button>
      )}
      {s.state !== 'quoted' && (
        <Button variant="secondary" size="sm" onClick={() => setQuoting((v) => !v)}>
          {quoting ? 'Cancel' : 'Raise quote'}
        </Button>
      )}
      {quoting && (
        <RaiseQuoteForm
          askId={askId}
          seller={s}
          onDone={() => {
            setQuoting(false);
            onQuoted();
          }}
        />
      )}
    </li>
  );
}

function RaiseQuoteForm({
  askId,
  seller,
  onDone,
}: {
  askId: string;
  seller: AskSellerStateItem;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const [rupees, setRupees] = useState('');
  const [qty, setQty] = useState('');
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [expiryExact, setExpiryExact] = useState('');
  const [deliveryBand, setDeliveryBand] = useState<'48h' | '2-5d'>('48h');
  const [provenance, setProvenance] = useState<'company' | 'auth'>('company');
  const [batch, setBatch] = useState('');
  const [days, setDays] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ready =
    Number(rupees) > 0 &&
    Number(qty) >= 1 &&
    /^(0[1-9]|1[0-2])\/\d{4}$/.test(expiryExact) &&
    days !== '' &&
    callNote.trim() !== '' &&
    (provenance !== 'auth' || batch.trim() !== '');

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyPostQuote(token, askId, {
          sellerCounterpartyId: seller.sellerCounterpartyId,
          ratePaiseForIndore: Math.round(Number(rupees) * 100),
          qtyAvailable: Number(qty),
          expiryBand,
          expiryExact,
          deliveryBand,
          provenance,
          batch: provenance === 'auth' ? batch.trim() : undefined,
          daysToIndore: Number(days),
          callNote: callNote.trim(),
        }),
      );
      onDone();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not raise this quote.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const id = (name: string) => `rq-${askId}-${seller.sellerId}-${name}`;
  return (
    <div className="mt-2 flex w-full flex-col gap-3 rounded border border-slate-200 p-3">
      <p className="text-slate-500">
        Raised on {seller.firm}&apos;s behalf, on a call. Same checks as his own quote.
      </p>
      <div className="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        <Input
          id={id('rate')}
          label="Rate for Indore (₹)"
          type="number"
          min={0}
          step="0.01"
          value={rupees}
          onChange={(e) => setRupees(e.target.value)}
        />
        <Input
          id={id('qty')}
          label="Boxes available"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          id={id('days')}
          label="Days to Indore"
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <Input
          id={id('expiry')}
          label="Exact expiry (MM/YYYY)"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        <Select
          id={id('band')}
          label="Expiry band"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as 'over12' | 'under12')}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Select
          id={id('delivery')}
          label="Delivery"
          value={deliveryBand}
          onChange={(e) => setDeliveryBand(e.target.value as '48h' | '2-5d')}
        >
          <option value="48h">48 hours</option>
          <option value="2-5d">2–5 days</option>
        </Select>
        <Select
          id={id('prov')}
          label="Stock"
          value={provenance}
          onChange={(e) => setProvenance(e.target.value as 'company' | 'auth')}
        >
          <option value="company">Company stock</option>
          <option value="auth">His own (authorised) stock</option>
        </Select>
        {provenance === 'auth' && (
          <Input
            id={id('batch')}
            label="Batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
        )}
      </div>
      <Textarea
        id={id('note')}
        label="Call note"
        required
        value={callNote}
        onChange={(e) => setCallNote(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-danger-500">
          {error}
        </p>
      )}
      <div>
        <Button loading={submitting} disabled={!ready} onClick={() => void submit()}>
          Raise quote
        </Button>
      </div>
    </div>
  );
}

function NonOrderReasonForm({ askId, onRecorded }: { askId: string; onRecorded: () => void }) {
  const { callApi } = useAuth();
  const [code, setCode] = useState<string>('');
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
        <option value="" disabled>
          Select a reason…
        </option>
        {SUPPLY_GAP_CODES.map((c) => (
          <option key={c} value={c}>
            {c.replaceAll('_', ' ')}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        size="sm"
        disabled={!code}
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
