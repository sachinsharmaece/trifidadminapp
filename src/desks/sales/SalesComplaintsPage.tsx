import { useCallback } from 'react';
import { getComplaintQueue } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

// Corrected M7 (QR-048/BR-206) — Controller decides fault; this is the
// buyer-conversation half only, never the seller or the seller's number.
// `transit_damage` (`'unhandled'`) is shown separately, visibly unresolved
// (QR-050). Relocated from the old flat `SalesDeskPage`.
export function SalesComplaintsPage() {
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
