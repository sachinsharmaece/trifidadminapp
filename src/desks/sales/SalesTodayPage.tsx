import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSalesWorklist, getMarketPulse, type SalesWorkItem } from '../../api/sales';
import { allocateUpcomingReceipt, getUpcomingReceipts } from '../../api/payment';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const BUCKET_ORDER: SalesWorkItem['bucket'][] = ['money', 'promised', 'he_asked', 'market'];

const BUCKET_LABEL: Record<SalesWorkItem['bucket'], string> = {
  money: 'Money',
  promised: 'Promised',
  he_asked: 'He asked',
  market: 'Market',
};

const BUCKET_NOTE: Record<SalesWorkItem['bucket'], string> = {
  money: 'A payment window running out, or money he says he has sent.',
  promised: 'You said you would. Nothing else in the system creates these.',
  he_asked: 'Waiting on a rate, or a held rate running out.',
  market: 'Rising where he is, and he buys it. The pulse is a call list and nothing else.',
};

/**
 * "Today" — everything the customer is waiting on (BR-282), grouped by
 * bucket rather than stage, plus Sales's own accounting act, payment
 * allocation (IC-13 — moved here from the Accounts desk).
 */
export function SalesTodayPage() {
  const { callApi } = useAuth();
  const worklistLoader = useCallback(() => callApi((token) => getSalesWorklist(token)), [callApi]);
  const { state: worklistState, retry: retryWorklist } = useAsyncData(
    worklistLoader,
    (items) => items.length === 0,
    [worklistLoader],
  );
  const pulseLoader = useCallback(() => callApi((token) => getMarketPulse(token)), [callApi]);
  const { state: pulseState } = useAsyncData(pulseLoader, (items) => items.length === 0, [
    pulseLoader,
  ]);
  const risingCount =
    pulseState.status === 'success'
      ? pulseState.data.filter((c) => c.status === 'rising').length
      : null;

  return (
    <div className="flex flex-col gap-6">
      <AsyncBoundary
        state={worklistState}
        onRetry={retryWorklist}
        emptyMessage="Nothing is waiting on you. Open the Funnel — every joint on it has an owner."
      >
        {(items) => <Worklist items={items} risingCount={risingCount} />}
      </AsyncBoundary>
      <PaymentAllocationSection />
    </div>
  );
}

function Worklist({ items, risingCount }: { items: SalesWorkItem[]; risingCount: number | null }) {
  const grouped = useMemo(() => {
    const map = new Map<SalesWorkItem['bucket'], SalesWorkItem[]>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    for (const item of items) map.get(item.bucket)?.push(item);
    return map;
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="On your plate" value={String(items.length)} />
        <Kpi label="Money" value={String(grouped.get('money')?.length ?? 0)} />
        <Kpi label="He asked" value={String(grouped.get('he_asked')?.length ?? 0)} />
        <Kpi label="Rising cells" value={risingCount == null ? '—' : String(risingCount)} />
      </div>

      {BUCKET_ORDER.filter((bucket) => (grouped.get(bucket)?.length ?? 0) > 0).map((bucket) => (
        <Card
          key={bucket}
          title={
            <span className="flex items-center gap-2">
              {BUCKET_LABEL[bucket]}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {grouped.get(bucket)?.length}
              </span>
            </span>
          }
        >
          <p className="mb-3 text-sm text-slate-500">{BUCKET_NOTE[bucket]}</p>
          <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
            {grouped.get(bucket)!.map((item, index) => (
              <WorkRow key={`${item.refType}-${item.refId}-${index}`} item={item} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

const REF_LABEL: Record<SalesWorkItem['refType'], string> = {
  so: 'Order',
  po: 'Purchase order',
  ask: 'Ask',
  quote: 'Rate held',
};

const linkClass = 'underline-offset-2 hover:underline';

function WorkRow({ item }: { item: SalesWorkItem }) {
  const navigate = useNavigate();
  const isMarket = item.bucket === 'market';
  const due = item.dueAt ? new Date(item.dueAt) : null;
  const overdue = due ? due < new Date() : false;
  const idLabel = `${REF_LABEL[item.refType]} …${item.refId.slice(-6)}`;

  // The party leads, as it did before product names came in — and the whole row opens his
  // file. A market row has no buyer (it's an area × product cell), so there the product leads.
  const hasBuyer = !!item.buyerId;
  const title = hasBuyer ? item.buyerFirm || idLabel : (item.productName ?? idLabel);

  const productLink =
    item.productId && item.productName ? (
      <Link
        to={`/sales/products/${item.productId}`}
        onClick={(e) => e.stopPropagation()}
        className={`text-slate-700 ${linkClass}`}
      >
        {item.productName}
      </Link>
    ) : null;
  const details = [
    isMarket
      ? item.tehsilName
        ? `Rising in ${item.tehsilName}`
        : 'Rising'
      : REF_LABEL[item.refType],
    item.qty != null ? `${item.qty} boxes` : null,
    due ? `due ${due.toLocaleString()}` : null,
  ].filter(Boolean);

  const content = (
    <>
      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">
          {hasBuyer && productLink}
          {hasBuyer && productLink && details.length > 0 && ' · '}
          {details.join(' · ')}
        </span>
      </div>
      {due && <Badge tone={overdue ? 'bad' : 'warn'}>{overdue ? 'overdue' : 'due'}</Badge>}
    </>
  );

  return hasBuyer ? (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/sales/buyers/${item.buyerId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/sales/buyers/${item.buyerId}`);
      }}
      className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
    >
      {content}
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-col text-left">
        {productLink ? (
          <Link
            to={`/sales/products/${item.productId}`}
            className={`text-sm font-semibold text-slate-900 ${linkClass}`}
          >
            {title}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        )}
        <span className="text-xs text-slate-500">{details.join(' · ')}</span>
      </div>
      {due && <Badge tone={overdue ? 'bad' : 'warn'}>{overdue ? 'overdue' : 'due'}</Badge>}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
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
    <Card title="Money — apply a claim (IC-13)">
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
                <Th numeric>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.upcomingReceiptId}>
                  <Td>{item.upcomingReceiptId}</Td>
                  <Td>{item.buyerId}</Td>
                  <Td numeric>₹{(item.amountPaise / 100).toFixed(2)}</Td>
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
