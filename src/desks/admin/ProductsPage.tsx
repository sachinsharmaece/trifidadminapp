import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEye } from 'react-icons/fi';
import { getAllProducts } from '../../api/catalog';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ProductDto } from '../../api/dto';

/** Manage → Products. The catalog-management list — every product, not scoped to one technical. */
export function ProductsPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(() => callApi((token) => getAllProducts(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Products</h1>
        <Button icon={<FiPlus />} onClick={() => navigate('/manage/products/new')}>
          Create product
        </Button>
      </div>
      <DevNote screen="admin_products" />

      <Card>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="No products yet.">
          {(items: ProductDto[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Brand</Th>
                  <Th>Technical</Th>
                  <Th>Manufacturer</Th>
                  <Th>HSN</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.productId}>
                    <Td>{product.brand}</Td>
                    <Td>{product.technical}</Td>
                    <Td>{product.manufacturerName ?? '—'}</Td>
                    <Td>{product.hsn}</Td>
                    <Td>{product.class}</Td>
                    <Td>
                      <Badge tone={product.active ? 'good' : 'neutral'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiEye />}
                        onClick={() => navigate(`/manage/products/${product.productId}`)}
                      >
                        View
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}
