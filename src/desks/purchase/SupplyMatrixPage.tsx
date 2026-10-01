import { Fragment, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getSupplyMatrixByProduct,
  getSupplyMatrixBySeller,
  getSupplyMatrixCallList,
  type SupplyMatrixCallListItem,
  type SupplyMatrixProductRow,
  type SupplyMatrixSellerRow,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DevNote } from '../../components/dev/DevNote';
import { formatRupees } from '../../lib/labels';

const CLASS_TONE = { A: 'good', B: 'neutral', C: 'warn' } as const;

// BR-274 — "two sources per cell" is the coverage target elsewhere in this
// codebase (`purchase.service.ts#getCoverageMap`'s own comment); reused here
// rather than a second, undocumented magic number.
const TWO_SOURCE_TARGET = 2;

export function SupplyMatrixPage() {
  const [searchParams] = useSearchParams();
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
      {byProduct ? <ByProduct initialQuery={searchParams.get('q') ?? ''} /> : <BySeller />}
    </div>
  );
}

function ByProduct({ initialQuery }: { initialQuery: string }) {
  const { callApi } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState<string | null>(null);
  const loader = useCallback(() => callApi((token) => getSupplyMatrixByProduct(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(rows: SupplyMatrixProductRow[]) => {
        const q = query.trim().toLowerCase();
        const filtered = q
          ? rows.filter(
              (r) => r.brand.toLowerCase().includes(q) || r.technical.toLowerCase().includes(q),
            )
          : rows;
        return (
          <div className="flex flex-col gap-3">
            <Input
              id="matrix-search"
              label="Search brand or technical"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Crop Shield"
            />
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Class</Th>
                  <Th numeric>Carries it</Th>
                  <Th numeric>On the board</Th>
                  <Th>State</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.productId}>
                    <tr>
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
                      <Td>
                        <Badge tone={CLASS_TONE[r.class]}>{r.class}</Badge>
                      </Td>
                      <Td numeric className={r.carryCount === 0 ? 'text-danger-500' : ''}>
                        {r.carryCount}
                      </Td>
                      <Td
                        numeric
                        className={
                          r.listedCount === 0 && r.carryCount > 0 ? 'text-warning-600' : ''
                        }
                      >
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
                      <Td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpanded(expanded === r.productId ? null : r.productId)}
                        >
                          {expanded === r.productId ? 'Hide call list' : 'Call list'}
                        </Button>
                      </Td>
                    </tr>
                    {expanded === r.productId && (
                      <tr>
                        <Td colSpan={6} className="bg-slate-50">
                          <CallListPanel productId={r.productId} />
                        </Td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}

/** Fetched on expand, not embedded in every row by default — a product's
 * call list is only worth the read when someone is about to work it. */
function CallListPanel({ productId }: { productId: string }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getSupplyMatrixCallList(token, productId)),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <AsyncBoundary
      state={state}
      onRetry={retry}
      emptyMessage="Nobody left to call — every seller who carries or lists this has already quoted."
    >
      {(items: SupplyMatrixCallListItem[]) => (
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((s) => (
            <li key={s.sellerId} className="flex items-center justify-between">
              <span className="font-medium">{s.firm}</span>
              <span className="text-xs text-slate-500">
                {s.state === 'listed' ? 'On the board' : 'Carries it, not listed'}
                {s.ratePaise !== null && ` · ${formatRupees(s.ratePaise)}`}
              </span>
            </li>
          ))}
        </ul>
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
              <Th numeric>Products he carries</Th>
              <Th numeric>On the board</Th>
              <Th>Companies</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sellerId}>
                <Td className="font-medium">{r.firm}</Td>
                <Td numeric className={r.carryCount === 0 ? 'text-danger-500' : ''}>
                  {r.carryCount}
                </Td>
                <Td
                  numeric
                  className={r.carryCount > 0 && r.listedCount === 0 ? 'text-warning-600' : ''}
                >
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
