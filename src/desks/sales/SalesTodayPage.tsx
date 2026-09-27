import { useCallback, useState } from 'react';
import { getSalesWorklist, type SalesWorkItem } from '../../api/sales';
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

const BUCKET_LABEL: Record<SalesWorkItem['bucket'], string> = {
  money: 'Money',
  promised: 'Promised',
  he_asked: 'He asked',
  market: 'Market',
};

/**
 * "Today" — everything the customer is waiting on (BR-282), grouped by
 * bucket rather than stage, plus Sales's own accounting act, payment
 * allocation (IC-13 — moved here from the Accounts desk). Relocated from
 * the old flat `SalesDeskPage`.
 */
export function SalesTodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <WorklistSection />
      <PaymentAllocationSection />
    </div>
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
