import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listSalesPushes, type SalesPushRow } from '../../api/push';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { PushStatusBadge } from '../../components/push/PushStatusBadge';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/dates';

/**
 * Phase 6 — "Pushed to Purchase": an executive sees his own pushes, a Sales
 * Leader his team's. Firm, date, the Purchase executive, status — and no
 * seller trade (rates, listings, catalogue) ever.
 */
export function SalesPushedPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => listSalesPushes(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (rows) => rows.length === 0, [loader]);

  return (
    <Card title="Pushed to Purchase">
      <AsyncBoundary
        state={state}
        onRetry={retry}
        emptyMessage="Nothing pushed yet. Use Push to Purchase on a buyer's file when he can also supply."
      >
        {(rows: SalesPushRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Firm</Th>
                <Th>Pushed</Th>
                <Th>By</Th>
                <Th>Purchase executive</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pushId}>
                  <Td>
                    <Link className="text-brand-600 underline" to={`/sales/buyers/${row.buyerId}`}>
                      {row.firm || 'Unnamed firm'}
                    </Link>
                  </Td>
                  <Td>{formatDate(row.pushedAt)}</Td>
                  <Td>{row.pushedBy ?? '—'}</Td>
                  <Td>{row.purchaseExecutive ?? '—'}</Td>
                  <Td>
                    <PushStatusBadge status={row.status} />
                    {row.status === 'rejected' && row.rejectionReason && (
                      <span className="ml-2 text-xs text-slate-500">{row.rejectionReason}</span>
                    )}
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
