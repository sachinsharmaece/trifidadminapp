import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiFlag } from 'react-icons/fi';
import {
  getActiveDemandByProduct,
  getAskSellerStates,
  postAskChase,
  postNonOrderReason,
  type ActiveDemandItem,
  type AskSellerStateItem,
  type DemandProductGroup,
} from '../../api/purchase';
import { deliveryBandLabel, expiryBandLabel } from '../../lib/labels';
import { timeAgo } from '../../lib/timeAgo';
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
    () => callApi((token) => getActiveDemandByProduct(token, noSellerOnly)),
    [callApi, noSellerOnly],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_demand" />
      <Card title="Active demand">
        <p className="mb-4 text-sm text-slate-500">
          One row per product — open it for each ask on it (pack, conditions, boxes), and an ask for
          its sellers. BR-272 — how many sellers are quoted, active, dormant or dark. No buyer
          identity, and open interest here is boxes only, never a rupee figure (BR-069) — a seller's
          own rate still shows when you open a row (BR-066), that&apos;s not what BR-069 governs.
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
          {(groups: DemandProductGroup[]) => (
            <Table className="mb-4">
              <thead>
                <tr>
                  <Th>Product</Th>
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
                {groups.map((group) => (
                  <ProductDemandRows
                    key={group.productId ?? group.asks[0]!.askId}
                    group={group}
                    onRecorded={retry}
                  />
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

/**
 * 30 Oct — one row per product (BR-371): its boxes and asks added up, each seller counted once
 * across them. It opens to its asks — each still its own row with Chase / Raise quote, since a
 * quote answers one ask. A product with a single ask opens straight to it.
 */
function ProductDemandRows({
  group,
  onRecorded,
}: {
  group: DemandProductGroup;
  onRecorded: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const single = group.askCount === 1;
  return (
    <>
      <tr className="cursor-pointer" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Td>
          {open ? '▾ ' : '▸ '}
          {group.brand} · {group.technical}
          <span className="ml-2 text-xs text-slate-500">
            {group.askCount} {single ? 'ask' : 'asks'}
          </span>
        </Td>
        <Td numeric>{group.totalBoxes}</Td>
        <Td numeric>{group.sellerCounts.quoted}</Td>
        <Td numeric>{group.sellerCounts.active}</Td>
        <Td numeric>{group.sellerCounts.dormant}</Td>
        <Td>
          {group.noSeller && (
            <div className="flex items-center gap-2">
              <Badge tone="warn">
                <FiFlag className="inline" /> No seller
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase/matrix?q=${encodeURIComponent(group.technical)}`);
                }}
              >
                Who could carry it →
              </Button>
            </div>
          )}
        </Td>
        <Td />
        <Td />
      </tr>
      {open &&
        group.asks.map((item) => (
          <AskRows key={item.askId} item={item} startOpen={single} onRecorded={onRecorded} />
        ))}
    </>
  );
}

/** "100 GM · over 12 months · within 48 hours" — what this ask is for. */
function askLabel(item: ActiveDemandItem): string {
  return [
    item.packLabel ?? 'All packs',
    expiryBandLabel(item.expiryBand),
    item.deliveryBand ? deliveryBandLabel(item.deliveryBand) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function AskRows({
  item,
  startOpen,
  onRecorded,
}: {
  item: ActiveDemandItem;
  startOpen: boolean;
  onRecorded: () => void;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <tr className="cursor-pointer bg-slate-50" onClick={() => setOpen((v) => !v)}>
        <Td>
          <span className="pl-6 text-sm text-slate-700">
            {open ? '▾ ' : '▸ '}
            {askLabel(item)}
            <span className="ml-2 text-xs text-slate-500">asked {timeAgo(item.createdAt)}</span>
          </span>
        </Td>
        <Td numeric>{item.qty}</Td>
        <Td numeric>{item.sellerCounts.quoted}</Td>
        <Td numeric>{item.sellerCounts.active}</Td>
        <Td numeric>{item.sellerCounts.dormant}</Td>
        <Td>{item.noSeller && <Badge tone="warn">No seller</Badge>}</Td>
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
