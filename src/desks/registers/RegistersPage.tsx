import { useCallback } from 'react';
import { getPurchaseRegister, getSalesRegister } from '../../api/payment';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import type { PurchaseRegisterRow, SalesRegisterRow } from '../../api/dto';

/** WF-08 — an SO enters the sales register the moment leg 2 dispatches. */
export function RegistersPage() {
  return (
    <main>
      <h1>Registers</h1>
      <SalesRegisterSection />
      <PurchaseRegisterSection />
    </main>
  );
}

function SalesRegisterSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSalesRegister(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <section>
      <h2>Sales register</h2>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No dispatched SOs yet.">
        {(items: SalesRegisterRow[]) => (
          <table>
            <thead>
              <tr>
                <th>SO</th>
                <th>Buyer</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.soId}>
                  <td>{row.soNo}</td>
                  <td>{row.buyerId}</td>
                  <td>₹{(row.totalPaise / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
    </section>
  );
}

function PurchaseRegisterSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getPurchaseRegister(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <section>
      <h2>Purchase register</h2>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No billed POs yet.">
        {(items: PurchaseRegisterRow[]) => (
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Seller</th>
                <th>Billed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.poId}>
                  <td>{row.poNo}</td>
                  <td>{row.sellerId}</td>
                  <td>{row.billed ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
    </section>
  );
}
