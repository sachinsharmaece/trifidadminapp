import { useCallback } from 'react';
import { getPurchaseRegister, getSalesRegister } from '../../api/payment';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import type { PurchaseRegisterRow, SalesRegisterRow } from '../../api/dto';

/** WF-08 — an SO enters the sales register the moment leg 2 dispatches. */
export function RegistersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Registers</h1>
      <DevNote screen="admin_registers" />
      <SalesRegisterSection />
      <PurchaseRegisterSection />
    </div>
  );
}

function SalesRegisterSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSalesRegister(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Sales register">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No dispatched SOs yet.">
        {(items: SalesRegisterRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>SO</Th>
                <Th>Buyer</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.soId}>
                  <Td>{row.soNo}</Td>
                  <Td>{row.buyerId}</Td>
                  <Td>₹{(row.totalPaise / 100).toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function PurchaseRegisterSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getPurchaseRegister(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Purchase register">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No billed POs yet.">
        {(items: PurchaseRegisterRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Seller</Th>
                <Th>Billed</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.poId}>
                  <Td>{row.poNo}</Td>
                  <Td>{row.sellerId}</Td>
                  <Td>
                    <Badge tone={row.billed ? 'good' : 'neutral'}>
                      {row.billed ? 'Yes' : 'No'}
                    </Badge>
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
