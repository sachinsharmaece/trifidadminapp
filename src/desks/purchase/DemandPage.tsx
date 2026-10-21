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
import { Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { RaiseQuoteForm } from './RaiseQuoteForm';
import { DevNote } from '../../components/dev/DevNote';

const SUPPLY_GAP_CODES = [
  'rate_above_market',
  'expiry_too_short',
  'delivery_too_slow',
  'moq_too_big',
  'quantity_short',
  'no_seller_in_scope',
] as const;

// The reason picker + "Log reason" button are hidden for now; flip to true to bring them back.
const SHOW_NON_ORDER_REASON = false;

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
          {SHOW_NON_ORDER_REASON && (
            <NonOrderReasonForm askId={item.askId} onRecorded={onRecorded} />
          )}
        </Td>
        <Td />
      </tr>
      {open && (
        <tr>
          <Td colSpan={8}>
            <QuoteGapsDetail askId={item.askId} skuId={item.skuId} productId={item.productId} />
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

function QuoteGapsDetail({
  askId,
  skuId,
  productId,
}: {
  askId: string;
  skuId: string | null;
  productId: string | null;
}) {
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
            <SellerStateRow
              key={s.sellerId}
              askId={askId}
              skuId={skuId}
              productId={productId}
              seller={s}
              onQuoted={retry}
            />
          ))}
        </ul>
      )}
    </AsyncBoundary>
  );
}

function SellerStateRow({
  askId,
  skuId,
  productId,
  seller: s,
  onQuoted,
}: {
  askId: string;
  skuId: string | null;
  productId: string | null;
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
          skuId={skuId}
          productId={productId}
          sellerId={s.sellerId}
          sellerCounterpartyId={s.sellerCounterpartyId}
          sellerFirm={s.firm}
          onDone={() => {
            setQuoting(false);
            onQuoted();
          }}
        />
      )}
    </li>
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
