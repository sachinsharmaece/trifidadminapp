import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import {
  getAdminSkus,
  getProductById,
  updateProduct,
  updateSku,
  type AdminSkuDto,
} from '../../api/catalog';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { newIdempotencyKey } from '../../lib/idempotency';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { ProductDto } from '../../api/dto';
import { CATEGORY_LABEL } from './productMasters';
import { ProductForm } from './ProductForm';

/**
 * Manage → Products → Product details: the product and its packs, read-only,
 * with Edit opening the same ProductForm Create uses (24 Oct). Packs list
 * every pack — inactive and draft too — read in the unit they were entered in.
 */
export function ProductDetailPage() {
  const { productId = '' } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const [editing, setEditing] = useState(false);

  const loader = useCallback(
    () =>
      Promise.all([
        callApi((token) => getProductById(token, productId)),
        callApi((token) => getAdminSkus(token, productId)),
      ]).then(([product, packs]) => ({ product, packs })),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/manage/products')}>
        Products
      </Button>
      <DevNote screen="admin_product_detail" />
      <AsyncBoundary state={state} onRetry={retry}>
        {({ product, packs }: { product: ProductDto; packs: AdminSkuDto[] }) =>
          editing ? (
            <ProductForm
              mode="edit"
              product={product}
              packs={packs}
              onSaved={() => {
                setEditing(false);
                retry();
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <ProductDetailCard
                product={product}
                onEdit={() => setEditing(true)}
                onChanged={retry}
              />
              <PacksCard packs={packs} onChanged={retry} />
            </>
          )
        }
      </AsyncBoundary>
    </div>
  );
}

/** Admin's one-way draft → live confirm, for a product or a pack; says so when it fails. */
function useConfirmDraft(onChanged: () => void) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function confirm(id: string, action: (token: string, key: string) => Promise<unknown>) {
    setBusy(id);
    try {
      const key = newIdempotencyKey();
      await callApi((token) => action(token, key));
      show('Confirmed — it is live now.');
      onChanged();
    } catch (error) {
      show(error instanceof ApiError ? error.message : 'Could not confirm it. Try again.');
    } finally {
      setBusy(null);
    }
  }
  return { busy, confirm };
}

function ProductDetailCard({
  product,
  onEdit,
  onChanged,
}: {
  product: ProductDto;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { busy, confirm } = useConfirmDraft(onChanged);
  return (
    <Card
      title={product.brand}
      actions={
        <div className="flex gap-2">
          {product.state === 'draft' && (
            <Button
              variant="secondary"
              loading={busy === product.productId}
              onClick={() =>
                void confirm(product.productId, (token, key) =>
                  updateProduct(token, product.productId, { state: 'live' }, key),
                )
              }
            >
              Confirm draft
            </Button>
          )}
          <Button variant="secondary" icon={<FiEdit2 />} onClick={onEdit}>
            Edit
          </Button>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Category</dt>
          <dd className="font-medium text-slate-900">
            {product.category ? CATEGORY_LABEL[product.category] : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Technical</dt>
          <dd className="font-medium text-slate-900">{product.technical}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Manufacturer</dt>
          <dd className="font-medium text-slate-900">{product.manufacturerName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">HSN</dt>
          <dd className="font-medium text-slate-900">{product.hsn}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tax %</dt>
          <dd className="font-medium text-slate-900">
            {product.taxPercent !== undefined ? `${product.taxPercent}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Class</dt>
          <dd className="font-medium text-slate-900">{product.class}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="flex gap-1">
            <Badge tone={product.active ? 'good' : 'neutral'}>
              {product.active ? 'Active' : 'Inactive'}
            </Badge>
            {product.state === 'draft' && <Badge tone="warn">draft</Badge>}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function PacksCard({ packs, onChanged }: { packs: AdminSkuDto[]; onChanged: () => void }) {
  const { busy, confirm } = useConfirmDraft(onChanged);
  return (
    <Card title="Packs">
      {packs.length === 0 ? (
        <p className="text-sm text-slate-500">No packs yet — add them with Edit.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Pack</Th>
              <Th numeric>Units in box</Th>
              <Th>One box holds</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {packs.map((pack) => (
              <tr key={pack.skuId}>
                <Td>
                  {pack.displaySize} {pack.unit}
                </Td>
                <Td numeric>{pack.unitsPerBox}</Td>
                <Td>
                  {pack.baseUnitsPerBox} {pack.baseUnit}
                </Td>
                <Td>
                  <span className="flex gap-1">
                    <Badge tone={pack.active === false ? 'neutral' : 'good'}>
                      {pack.active === false ? 'Inactive' : 'Active'}
                    </Badge>
                    {pack.state === 'draft' && <Badge tone="warn">draft</Badge>}
                  </span>
                </Td>
                <Td>
                  {pack.state === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy === pack.skuId}
                      onClick={() =>
                        void confirm(pack.skuId, (token, key) =>
                          updateSku(token, pack.skuId, { state: 'live' }, key),
                        )
                      }
                    >
                      Confirm
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
