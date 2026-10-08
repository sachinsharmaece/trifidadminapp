import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  getFunnelAsks,
  getFunnelHeldRates,
  type FunnelAskRow,
  type FunnelHeldRateRow,
} from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const linkClass = 'underline-offset-2 hover:underline';

function ProductCell({
  row,
}: {
  row: { productId: string | null; brand: string; technical: string; packLabel: string | null };
}) {
  const name = `${row.brand}${row.packLabel ? ` · ${row.packLabel}` : ''}`;
  return (
    <>
      {row.productId ? (
        <Link
          to={`/sales/products/${row.productId}`}
          className={`font-medium text-slate-900 ${linkClass}`}
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium text-slate-900">{name}</span>
      )}
      <div className="text-xs text-slate-500">{row.technical}</div>
    </>
  );
}

function BuyerCell({ row }: { row: { buyerId: string; buyerFirm: string } }) {
  return (
    <Link to={`/sales/buyers/${row.buyerId}`} className={linkClass}>
      {row.buyerFirm || 'Open buyer'}
    </Link>
  );
}

function ListShell({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/funnel')}>
          Back to the funnel
        </Button>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{note}</p>
      </div>
      <Card>{children}</Card>
    </div>
  );
}

/** Funnel → Asked: every ask the count includes, with the ones past the SLA flagged. */
export function SalesFunnelAskedPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getFunnelAsks(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  return (
    <ListShell
      title="Asked"
      note="Asks not yet lapsed or withdrawn. Those still open with no quote after 26 hours are past SLA."
    >
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No live asks.">
        {(items: FunnelAskRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Buyer</Th>
                <Th numeric>Boxes</Th>
                <Th>State</Th>
                <Th>Asked</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.askId}>
                  <Td>
                    <ProductCell row={a} />
                  </Td>
                  <Td>
                    <BuyerCell row={a} />
                  </Td>
                  <Td numeric>{a.qty}</Td>
                  <Td>
                    <Badge tone="neutral">{a.state}</Badge>
                    {a.pastSla && (
                      <span className="ml-2">
                        <Badge tone="bad">past SLA</Badge>
                      </span>
                    )}
                  </Td>
                  <Td>{new Date(a.createdAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </ListShell>
  );
}

/** Funnel → Rate held: every live quote the count includes, soonest to lapse first. */
export function SalesFunnelRateHeldPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getFunnelHeldRates(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  return (
    <ListShell
      title="Rate held"
      note="Quotes currently live — a buyer holding a rate right now, soonest to lapse first."
    >
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="No rates held right now.">
        {(items: FunnelHeldRateRow[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Buyer</Th>
                <Th numeric>Boxes</Th>
                <Th>Held until</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.quoteId}>
                  <Td>
                    <ProductCell row={q} />
                  </Td>
                  <Td>
                    <BuyerCell row={q} />
                  </Td>
                  <Td numeric>{q.qty}</Td>
                  <Td>{new Date(q.heldUntil).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </ListShell>
  );
}
