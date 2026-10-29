import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEye, FiRotateCcw } from 'react-icons/fi';
import { getAllProductsPage, restoreProduct, updateProduct } from '../../api/catalog';
import { formatDateTime } from '../../lib/dates';
import { ApiError } from '../../api/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { useToast } from '../../components/ui/Toast';
import { CATEGORY_LABEL } from './productMasters';
import { DevNote } from '../../components/dev/DevNote';
import { useDebounced, usePagedList } from '../../lib/usePagedList';
import { ListFooter, ListSearch } from '../../components/ListFooter';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ProductDto } from '../../api/dto';

/**
 * Manage → Products. The catalog-management list — every product, not scoped
 * to one technical. 29 Oct: newest first, 50 at a time (the next page loads as
 * you scroll, or "Load more"), searched on the server — it used to show only
 * the first 100.
 */
export function ProductsPage() {
  const { callApi } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const q = useDebounced(searchText.trim());
  // 29 Oct — the soft-deleted products instead, each with Restore (BR-370).
  const [showDeleted, setShowDeleted] = useState(false);
  const loadPage = useCallback(
    (cursor?: string) =>
      callApi((token) => getAllProductsPage(token, { q, cursor, limit: 50, deleted: showDeleted })),
    [callApi, q, showDeleted],
  );
  const list = usePagedList<ProductDto>(loadPage);
  const retry = () => void list.reload();

  async function confirmDraft(productId: string): Promise<void> {
    try {
      const key = newIdempotencyKey();
      await callApi((token) => updateProduct(token, productId, { state: 'live' }, key));
      show('Confirmed — the product is live now.');
      retry();
    } catch (error) {
      show(error instanceof ApiError ? error.message : 'Could not confirm it. Try again.');
    }
  }

  async function restore(product: ProductDto): Promise<void> {
    try {
      const key = newIdempotencyKey();
      await callApi((token) => restoreProduct(token, product.productId, key));
      show(`${product.brand} restored — inactive. Edit it and tick Active to sell it again.`);
      retry();
    } catch (error) {
      show(error instanceof ApiError ? error.message : 'Could not restore it. Try again.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Products</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ListSearch
            id="products-search"
            label="Search products"
            placeholder="Search product, technical or company"
            value={searchText}
            onChange={setSearchText}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show deleted products
          </label>
          <Button icon={<FiPlus />} onClick={() => navigate('/manage/products/new')}>
            Create product
          </Button>
        </div>
      </div>
      <DevNote screen="admin_products" />

      <Card>
        {list.status === 'loading' && <Loader />}
        {list.status === 'error' && (
          <ErrorState message={list.error ?? 'Could not load products.'} onRetry={retry} />
        )}
        {list.status === 'ready' && list.items.length === 0 && (
          <EmptyState
            message={
              q
                ? `No ${showDeleted ? 'deleted ' : ''}product matches “${q}”.`
                : showDeleted
                  ? 'No deleted products.'
                  : 'No products yet.'
            }
          />
        )}
        {list.status === 'ready' && list.items.length > 0 && showDeleted && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Technical</Th>
                  <Th>Manufacturer</Th>
                  <Th>Deleted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((product) => (
                  <tr key={product.productId}>
                    <Td>{product.brand}</Td>
                    <Td>{product.technical}</Td>
                    <Td>{product.manufacturerName ?? '—'}</Td>
                    <Td>
                      {product.deletedAt ? formatDateTime(product.deletedAt) : '—'}
                      {product.deletedByName && (
                        <div className="text-xs text-slate-500">by {product.deletedByName}</div>
                      )}
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiRotateCcw />}
                        onClick={() => void restore(product)}
                      >
                        Restore
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListFooter
              shown={list.items.length}
              total={list.total}
              hasMore={list.hasMore}
              loading={list.loadingMore}
              error={list.error}
              onMore={() => void list.loadMore()}
            />
          </>
        )}
        {list.status === 'ready' && list.items.length > 0 && !showDeleted && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Technical</Th>
                  <Th>Manufacturer</Th>
                  <Th>HSN</Th>
                  <Th>Tax %</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((product) => (
                  <tr key={product.productId}>
                    <Td>{product.brand}</Td>
                    <Td>{product.category ? CATEGORY_LABEL[product.category] : '—'}</Td>
                    <Td>{product.technical}</Td>
                    <Td>{product.manufacturerName ?? '—'}</Td>
                    <Td>{product.hsn}</Td>
                    <Td>{product.taxPercent !== undefined ? `${product.taxPercent}%` : '—'}</Td>
                    <Td>{product.class}</Td>
                    <Td>
                      <Badge tone={product.active ? 'good' : 'neutral'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.state === 'draft' && (
                        <span className="ml-1">
                          <Badge tone="warn">draft</Badge>
                        </span>
                      )}
                    </Td>
                    <Td className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiEye />}
                        onClick={() => navigate(`/manage/products/${product.productId}`)}
                      >
                        View
                      </Button>
                      {product.state === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void confirmDraft(product.productId)}
                        >
                          Confirm
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListFooter
              shown={list.items.length}
              total={list.total}
              hasMore={list.hasMore}
              loading={list.loadingMore}
              error={list.error}
              onMore={() => void list.loadMore()}
            />
          </>
        )}
      </Card>
    </div>
  );
}
