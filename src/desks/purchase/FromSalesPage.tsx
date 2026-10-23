import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPurchasePushes, type PurchasePushRow, type PushStatus } from '../../api/push';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { PushStatusBadge } from '../../components/push/PushStatusBadge';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, Th, Td } from '../../components/ui/Table';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/dates';

const TABS: Array<{ key: 'open' | PushStatus; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

/**
 * Phase 6 — "From Sales": buyers Sales pushed because they can also supply.
 * The receiver sees his own, a Purchase Leader his team's. Only the firm,
 * who pushed him and the note — never the buyer's orders, rates or calls.
 */
export function FromSalesPage() {
  const { callApi } = useAuth();
  const [tab, setTab] = useState<'open' | PushStatus>('open');
  const loader = useCallback(
    () => callApi((token) => listPurchasePushes(token, tab)),
    [callApi, tab],
  );
  const { state, retry } = useAsyncData(loader, (rows) => rows.length === 0, [loader]);

  return (
    <Card title="From Sales">
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'primary' : 'secondary'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing from Sales here.">
        {(rows: PurchasePushRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Firm</Th>
                <Th>Pushed by</Th>
                <Th>What he can supply</Th>
                <Th>Pushed</Th>
                <Th>With</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pushId}>
                  <Td>
                    <Link
                      className="text-brand-600 underline"
                      to={`/purchase/from-sales/${row.pushId}`}
                    >
                      {row.firm || 'Unnamed firm'}
                    </Link>{' '}
                    <Badge variant="chip" tone="neutral">
                      From Sales
                    </Badge>
                  </Td>
                  <Td>{row.pushedBy ?? '—'}</Td>
                  <Td className="max-w-xs truncate" title={row.note}>
                    {row.note}
                  </Td>
                  <Td>{formatDate(row.pushedAt)}</Td>
                  <Td>{row.receiver ?? '—'}</Td>
                  <Td>
                    <PushStatusBadge status={row.status} />
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
