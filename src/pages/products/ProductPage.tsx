import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import type { Product, Sku } from '@/features/products/api';
import { useProduct, useProductLookups, useUpdateProduct } from '@/features/products/hooks';
import { PackForm } from '@/features/products/PackForm';
import { PacksTable } from '@/features/products/PacksTable';
import { ProductForm } from '@/features/products/ProductForm';
import { CATEGORY_LABELS } from '@/types/product';
import { formatPercent } from '@/utils/format';

/** One product: its details, and its packs. */
export function ProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);

  if (product.isPending) {
    return <Spinner label="Loading product" className="h-6 w-6 text-brand-600" />;
  }
  if (product.isError) {
    return (
      <ErrorState title="Could not load this product" message={product.error.message}>
        <Button onClick={() => void product.refetch()}>Try again</Button>
        <Link to="/products" className="text-sm font-medium text-brand-700 hover:underline">
          Back to products
        </Link>
      </ErrorState>
    );
  }
  return <ProductDetails product={product.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  const canEdit = useCanEditMasters();
  const lookups = useProductLookups();
  const update = useUpdateProduct();
  const [editingDetails, setEditingDetails] = useState(false);
  // 'new' = the add-pack form is open; a pack = editing it; null = no pack form.
  const [editingPack, setEditingPack] = useState<Sku | 'new' | null>(null);

  function toggleActive() {
    if (product.active && !window.confirm(`Turn off ${product.name}?`)) return;
    update.mutate({ id: product.id, changes: { active: !product.active } });
  }

  const details: [string, string][] = [
    ['Category', CATEGORY_LABELS[product.category]],
    ['Manufacturer', lookups.manufacturerName(product.manufacturerId)],
    ['Technical', lookups.technicalName(product.technicalId)],
    ['HSN code', lookups.hsnCodeText(product.hsnCodeId)],
    ['GST rate', formatPercent(product.taxBp)],
  ];

  return (
    <PageLayout
      title={product.name}
      description="Product details and packs."
      actions={
        canEdit &&
        !editingDetails && (
          <>
            <Button variant="secondary" onClick={() => setEditingDetails(true)}>
              Edit details
            </Button>
            <Button
              variant={product.active ? 'danger' : 'secondary'}
              onClick={toggleActive}
              loading={update.isPending}
            >
              {product.active ? 'Turn off' : 'Turn on'}
            </Button>
          </>
        )
      }
    >
      <Link
        to="/products"
        className="inline-block text-sm font-medium text-brand-700 hover:underline"
      >
        ← All products
      </Link>
      <ErrorAlert message={update.error?.message} />

      {editingDetails ? (
        <ProductForm
          product={product}
          onSaved={() => setEditingDetails(false)}
          onCancel={() => setEditingDetails(false)}
        />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs uppercase text-slate-500">Status</dt>
              <dd className="mt-1">
                <ActiveBadge active={product.active} />
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Packs</h2>
          {canEdit && editingPack === null && (
            <Button variant="secondary" onClick={() => setEditingPack('new')}>
              Add pack
            </Button>
          )}
        </div>
        {editingPack !== null && (
          <PackForm
            key={editingPack === 'new' ? 'new' : editingPack.id}
            productId={product.id}
            sku={editingPack === 'new' ? undefined : editingPack}
            onDone={() => setEditingPack(null)}
          />
        )}
        <PacksTable skus={product.skus} canEdit={canEdit} onEdit={setEditingPack} />
      </section>
    </PageLayout>
  );
}
