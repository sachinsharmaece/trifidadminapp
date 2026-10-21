import { useCallback } from 'react';
import { getPoQueue, type PoStageItem } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { timeAgo, useMinuteClock } from '../../lib/timeAgo';
import { RecordInvoiceButton } from './StageActions';

/** PO — released on the buyer's payment; waiting on the seller to bill the goods. */
export function PoPage() {
  const { callApi } = useAuth();
  const now = useMinuteClock();
  const loader = useCallback(() => callApi((token) => getPoQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Purchase orders released">
        <p className="mb-4 text-sm text-slate-500">
          The buyer has paid, so the PO is out and the seller must dispatch the same day. When he
          has billed the goods, record his invoice and e-way bill — the PO then moves to Billed.
        </p>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="No PO is waiting on a seller's bill.">
          {(items: PoStageItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>PO</Th>
                  <Th>Seller</Th>
                  <Th>Goods</Th>
                  <Th>Released</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((po) => (
                  <tr key={po.poId}>
                    <Td className="font-mono">{po.poNo}</Td>
                    <Td>{po.sellerFirm}</Td>
                    <Td>
                      {po.brand} {po.packLabel} · {po.boxes} boxes
                    </Td>
                    <Td>
                      <span title={new Date(po.releasedAt).toLocaleString()}>
                        {timeAgo(po.releasedAt, now)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <RecordInvoiceButton po={po} onDone={retry} />
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
