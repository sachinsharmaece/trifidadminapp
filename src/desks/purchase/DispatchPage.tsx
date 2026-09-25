import { useCallback, useState } from 'react';
import {
  getDispatchChaseQueue,
  postDispatchChase,
  type DispatchQueueItem,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

export function DispatchPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getDispatchChaseQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const due = (items: DispatchQueueItem[]) => items.filter((d) => d.bucket !== 'in_transit');
  const inTransit = (items: DispatchQueueItem[]) => items.filter((d) => d.bucket === 'in_transit');

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_dispatch" />
      <p className="text-sm text-slate-500">
        The seller dispatches on the day his PO releases, against his own cut-off. Extending the
        clock in bulk is a Controller action, kept separate from this queue.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing pending dispatch.">
        {(items: DispatchQueueItem[]) => (
          <>
            <Card title="Due or overdue">
              <Table>
                <thead>
                  <tr>
                    <Th>PO</Th>
                    <Th>Seller</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {due(items).map((d) => (
                    <DispatchRow key={d.poId} item={d} onChased={retry} />
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card title="On the way to Indore">
              <Table>
                <thead>
                  <tr>
                    <Th>PO</Th>
                    <Th>Seller</Th>
                    <Th>Dispatched</Th>
                    <Th>Days out</Th>
                  </tr>
                </thead>
                <tbody>
                  {inTransit(items).map((d) => (
                    <tr key={d.poId}>
                      <Td className="font-mono">{d.poNo}</Td>
                      <Td className="font-mono text-xs">{d.sellerId.slice(-6)}</Td>
                      <Td>
                        {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString() : '—'}
                      </Td>
                      <Td>{d.daysInTransit ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function DispatchRow({ item, onChased }: { item: DispatchQueueItem; onChased: () => void }) {
  const { callApi } = useAuth();
  const [chased, setChased] = useState(false);
  return (
    <tr>
      <Td className="font-mono">{item.poNo}</Td>
      <Td className="font-mono text-xs">{item.sellerId.slice(-6)}</Td>
      <Td>{new Date(item.dispatchDueDate).toLocaleString()}</Td>
      <Td>
        {item.bucket === 'overdue' ? (
          <Badge tone="bad">{Math.abs(Math.round(item.hoursLeft ?? 0))}h over</Badge>
        ) : (
          <Badge tone="warn">{Math.round(item.hoursLeft ?? 0)}h left</Badge>
        )}
        {item.noDispatch48h && (
          <span className="ml-2">
            <Badge tone="bad">48h failure line passed</Badge>
          </span>
        )}
      </Td>
      <Td>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void callApi((token) => postDispatchChase(token, item.poId)).then(() => {
              setChased(true);
              onChased();
            })
          }
        >
          {chased ? 'Chased' : 'Chase'}
        </Button>
      </Td>
    </tr>
  );
}
