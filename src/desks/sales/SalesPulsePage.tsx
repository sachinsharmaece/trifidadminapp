import { useCallback } from 'react';
import { getMarketPulse, getRetention } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

/** Market pulse (BR-278) and retention (BR-281) — relocated from the old flat `SalesDeskPage`. */
export function SalesPulsePage() {
  return (
    <div className="flex flex-col gap-6">
      <PulseSection />
      <RetentionSection />
    </div>
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
