import { useCallback } from 'react';
import { getBilledQueue, type PoStageItem } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { HandToDispatchButton } from './StageActions';
import { formatDate } from '../../lib/dates';

/** Billed — the seller has invoiced the goods; ready to be handed to Dispatch. */
export function BilledPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getBilledQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Billed by the seller">
        <p className="mb-4 text-sm text-slate-500">
          His invoice and e-way bill are on record. Move the PO to Dispatch so he is chased until
          the goods are on the way to Indore. This invoice is separate from the seller bill booked
          after inspection, which is what he is paid on.
        </p>
        <AsyncBoundary
          state={state}
          onRetry={retry}
          emptyMessage="No billed PO is waiting to move on."
        >
          {(items: PoStageItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>PO</Th>
                  <Th>Seller</Th>
                  <Th>Goods</Th>
                  <Th>Invoice</Th>
                  <Th>E-way bill</Th>
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
                      <div className="font-mono">{po.invoiceNo}</div>
                      {po.invoiceDate && (
                        <div className="text-xs text-slate-500">{formatDate(po.invoiceDate)}</div>
                      )}
                    </Td>
                    <Td className="font-mono">{po.ewayNo}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <HandToDispatchButton po={po} onDone={retry} />
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
