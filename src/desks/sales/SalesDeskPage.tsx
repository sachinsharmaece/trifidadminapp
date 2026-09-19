import { useCallback, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
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
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
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
      <WorklistSection />
      <PaymentAllocationSection />
      <MspQueueSection />
      <ComplaintQueueSection />
      <PulseSection />
      <RetentionSection />
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
        posts it against exactly the SOs picked here (BR-012, INV-15).
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
          label="SO IDs (comma-separated)"
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
