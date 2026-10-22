import { useCallback } from 'react';
import { getStockQueue, type StockQueueItem } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { timeAgo, useMinuteClock } from '../../lib/timeAgo';
import { formatRupees } from '../../lib/labels';
import { AdjustHoldButton } from './StageActions';
import { formatDateTime } from '../../lib/dates';

function hoursLabel(hours: number | null): string {
  if (hours === null) return '';
  if (hours < 0) return `ran out ${Math.round(-hours)}h ago`;
  return `${Math.round(hours * 10) / 10}h left`;
}

/** Stock — confirmed orders the buyer has not paid for yet; the seller is asked to hold the stock. */
export function StockPage() {
  const { callApi } = useAuth();
  const now = useMinuteClock();
  const loader = useCallback(() => callApi((token) => getStockQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Stock on hold until the buyer pays">
        <p className="mb-4 text-sm text-slate-500">
          Once a seller has confirmed, the buyer has his payment window to pay, and the stock goes
          on hold for that long (24 hours) on its own. Change the hours only if the seller agreed to
          something different. The PO is created only when the money lands; if it does not, the
          order cancels and he is released with no strike.
        </p>
        <AsyncBoundary
          state={state}
          onRetry={retry}
          emptyMessage="Nothing is waiting on a buyer's payment."
        >
          {(items: StockQueueItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Seller</Th>
                  <Th>Goods</Th>
                  <Th numeric>Rate</Th>
                  <Th>Buyer pays by</Th>
                  <Th>Hold</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.soId}>
                    <Td className="font-mono">{item.soNo}</Td>
                    <Td>{item.sellerFirm}</Td>
                    <Td>
                      {item.brand} {item.packLabel} · {item.boxes} boxes
                    </Td>
                    <Td numeric>
                      {item.sellerRatePaise == null ? '—' : formatRupees(item.sellerRatePaise)}
                    </Td>
                    <Td>{formatDateTime(item.payDeadline)}</Td>
                    <Td>
                      {item.hold === 'holding' && <Badge tone="good">seller is holding it</Badge>}
                      {item.hold === 'lapsed' && <Badge tone="bad">hold ran out</Badge>}
                      <div
                        className="mt-1 text-xs text-slate-500"
                        title={formatDateTime(item.holdUntil)}
                      >
                        {item.holdHours !== null && `${item.holdHours}h hold · `}
                        {hoursLabel(item.hoursLeft)}
                        {item.holdConfirmedAt && ` · from ${timeAgo(item.holdConfirmedAt, now)}`}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <AdjustHoldButton item={item} onDone={retry} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}
