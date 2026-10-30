import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
  deleteProduct,
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
import { Modal } from '../../components/ui/Modal';
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
                onDeleted={() => navigate('/manage/products')}
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
  onDeleted,
}: {
  product: ProductDto;
  onEdit: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { busy, confirm } = useConfirmDraft(onChanged);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <DeleteProductModal
        product={product}
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={onDeleted}
      />
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
            <Button variant="danger" icon={<FiTrash2 />} onClick={() => setDeleting(true)}>
              Delete
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
    </>
  );
}

/**
 * 29 Oct — soft delete (BR-370). The server refuses while a listing, ask, pile, pool or unfinished
 * order still points at the product; the dialog then says what is holding it.
 */
function DeleteProductModal({
  product,
  open,
  onClose,
  onDeleted,
}: {
  product: ProductDto;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; reasons: string[] } | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const key = newIdempotencyKey();
      await callApi((token) => deleteProduct(token, product.productId, key));
      show(`${product.brand} deleted. Restore it from Deleted products.`);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PRODUCT_IN_USE') {
        const reasons = Array.isArray(err.meta?.reasons) ? (err.meta.reasons as string[]) : [];
        setError({ message: `${product.brand} is still in use:`, reasons });
      } else {
        setError({
          message: err instanceof ApiError ? err.message : 'Could not delete it. Try again.',
          reasons: [],
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={`Delete ${product.brand}?`} onClose={close}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          It disappears from every list and picker. Past orders keep its name. You can restore it
          from Deleted products.
        </p>
        {error && (
          <div role="alert" className="rounded border border-danger-500/40 p-3 text-sm">
            <p className="text-danger-500">{error.message}</p>
            {error.reasons.length > 0 && (
              <>
                <ul className="mt-1 list-disc pl-5 text-slate-700">
                  {error.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-2 text-slate-600">
                  Ask the seller to pause a live listing, and let the rest finish, then delete it.
                </p>
                <p className="mt-1 text-slate-600">
                  To stop selling it now, untick Active (Edit) — its listings drop off every board
                  at once.
                </p>
              </>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" loading={submitting} onClick={() => void submit()}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
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
