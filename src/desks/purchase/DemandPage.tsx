import { useCallback, useState } from 'react';
import { FiFlag } from 'react-icons/fi';
import {
  getActiveDemandList,
  getAskSellerStates,
  postNonOrderReason,
  type ActiveDemandItem,
  type AskSellerStateItem,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <Td>
          {open ? '▾ ' : '▸ '}
          {item.askId.slice(-6)}
        </Td>
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
          {sellers.map((s) => {
            const { label, tone } = SELLER_STATE_LABEL[s.state];
            return (
              <li key={s.sellerId} className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{s.firm}</span>
                <Badge tone={tone}>{label}</Badge>
                {s.ratePaise !== null && (
                  <span className="text-slate-500">₹{(s.ratePaise / 100).toFixed(2)}</span>
                )}
                {s.gapCodes.length > 0 && (
                  <span className="text-danger-500">
                    short: {s.gapCodes.join(', ').replaceAll('_', ' ')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AsyncBoundary>
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
