import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalesBoard, type BoardProductRow } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useShownList } from '../../lib/usePagedList';
import { ListFooter, ListSearch } from '../../components/ListFooter';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { formatRupees } from '../../lib/labels';

function formatRate(ratePaise: number | null): string {
  return ratePaise === null ? '—' : formatRupees(ratePaise);
}

/** The rate board — one row per product, cheapest rate and how many buyers actually take it. */
export function SalesProductsPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSalesBoard(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Products</h1>
      <Card>
        <p className="mb-4 text-sm text-slate-500">
          Several rates on one product is normal — the cheap rung has a big MOQ and a slow band, the
          dear rung ships tomorrow box to box; that choice is the conversation.
        </p>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing on the board yet.">
          {(rows: BoardProductRow[]) => <BoardTable rows={rows} />}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

/**
 * 29 Oct — the board loads in full (it is worked out from every live
 * listing), so it is searched here and shown 50 rows at a time, with the
 * next 50 as you scroll or click "Load more".
 */
function BoardTable({ rows }: { rows: BoardProductRow[] }) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const needle = searchText.trim().toLowerCase();
  const matching = useMemo(
    () =>
      needle
        ? rows.filter((r) =>
            [r.brand, r.technicalName, r.manufacturerName].some((f) =>
              f?.toLowerCase().includes(needle),
            ),
          )
        : rows,
    [rows, needle],
  );
  const shown = useShownList(matching, 50, needle);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <ListSearch
          id="sales-products-search"
          label="Search products"
          placeholder="Search product, technical or company"
          value={searchText}
          onChange={setSearchText}
        />
      </div>
      {matching.length === 0 ? (
        <p className="text-sm text-slate-500">No product matches “{searchText.trim()}”.</p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th numeric>Rates</Th>
                <Th numeric>Cheapest rate</Th>
                <Th numeric>Buyers who take it</Th>
              </tr>
            </thead>
            <tbody>
              {shown.visible.map((r) => (
                <tr
                  key={r.productId}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/sales/products/${r.productId}`)}
                >
                  <Td className="font-medium">
                    {r.brand}
                    <div className="text-xs text-slate-500">
                      {r.technicalName} · {r.manufacturerName}
                    </div>
                  </Td>
                  <Td numeric>{r.ladderCount}</Td>
                  <Td numeric>{formatRate(r.cheapestRatePaise)}</Td>
                  <Td numeric className={r.buyerCount === 0 ? 'text-danger-500' : ''}>
                    {r.buyerCount}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ListFooter
            shown={shown.visible.length}
            total={shown.total}
            hasMore={shown.hasMore}
            onMore={shown.showMore}
          />
        </>
      )}
    </>
  );
}
