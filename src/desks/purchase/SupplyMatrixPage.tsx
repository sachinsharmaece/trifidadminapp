import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSupplyMatrixByProduct,
  getSupplyMatrixBySeller,
  type SupplyMatrixProductRow,
  type SupplyMatrixSellerRow,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

// BR-274 — "two sources per cell" is the coverage target elsewhere in this
// codebase (`purchase.service.ts#getCoverageMap`'s own comment); reused here
// rather than a second, undocumented magic number.
const TWO_SOURCE_TARGET = 2;

export function SupplyMatrixPage() {
  const [byProduct, setByProduct] = useState(true);
  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_matrix" />
      <p className="text-sm text-slate-500">
        Who sells what. One dataset, read either way — down a product for the call list, or across a
        seller for his whole business.
      </p>
      <div className="flex gap-2">
        <Button
          variant={byProduct ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setByProduct(true)}
        >
          Product × Seller
        </Button>
        <Button
          variant={!byProduct ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setByProduct(false)}
        >
          Seller × Product
        </Button>
      </div>
      {byProduct ? <ByProduct /> : <BySeller />}
    </div>
  );
}

function ByProduct() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSupplyMatrixByProduct(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(rows: SupplyMatrixProductRow[]) => (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Carries it</Th>
              <Th>On the board</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId}>
                <Td className="font-medium">
                  {r.brand}
                  {r.productState === 'draft' && (
                    <span className="ml-2">
                      <Badge tone="warn">draft</Badge>
                    </span>
                  )}
                  <div className="text-xs text-slate-500">
                    {r.technical} · {r.manufacturerName}
                  </div>
                </Td>
                <Td className={r.carryCount === 0 ? 'text-danger-500' : ''}>{r.carryCount}</Td>
                <Td className={r.listedCount === 0 && r.carryCount > 0 ? 'text-warning-600' : ''}>
                  {r.listedCount}
                </Td>
                <Td>
                  {r.carryCount === 0 ? (
                    <Badge tone="bad">nobody carries it</Badge>
                  ) : r.listedCount === 0 ? (
                    <Badge tone="warn">carried, none on the board</Badge>
                  ) : r.listedCount < TWO_SOURCE_TARGET ? (
                    <Badge tone="neutral">single source</Badge>
                  ) : (
                    <Badge tone="good">at target</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </AsyncBoundary>
  );
}

function BySeller() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => callApi((token) => getSupplyMatrixBySeller(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(rows: SupplyMatrixSellerRow[]) => (
        <Table>
          <thead>
            <tr>
              <Th>Seller</Th>
              <Th>Products he carries</Th>
              <Th>On the board</Th>
              <Th>Companies</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sellerId}>
                <Td className="font-medium">{r.firm}</Td>
                <Td className={r.carryCount === 0 ? 'text-danger-500' : ''}>{r.carryCount}</Td>
                <Td className={r.carryCount > 0 && r.listedCount === 0 ? 'text-warning-600' : ''}>
                  {r.listedCount}
                </Td>
                <Td className="text-xs text-slate-500">{r.manufacturerNames.join(', ') || '—'}</Td>
                <Td>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/purchase/sellers/${r.sellerId}`)}
                  >
                    Open
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </AsyncBoundary>
  );
}
