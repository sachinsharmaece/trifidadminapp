import { Link } from 'react-router';
import { ActiveBadge } from '@/components/atoms/ActiveBadge';
import { Badge } from '@/components/atoms/Badge';
import { CATEGORY_LABELS } from '@/types/product';
import { formatPercent } from '@/utils/format';
import type { Product } from './api';
import { useProductLookups } from './hooks';

interface ProductsTableProps {
  products: readonly Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const lookups = useProductLookups();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Manufacturer</th>
            <th className="px-4 py-3 font-medium">Technical</th>
            <th className="px-4 py-3 font-medium">Packs</th>
            <th className="px-4 py-3 font-medium">GST</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No products found.
              </td>
            </tr>
          )}
          {products.map((product) => (
            <tr key={product.id} className={product.active ? '' : 'text-slate-500'}>
              <td className="px-4 py-3">
                <Link
                  to={`/products/${product.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[product.category]}</p>
              </td>
              <td className="px-4 py-3">{lookups.manufacturerName(product.manufacturerId)}</td>
              <td className="px-4 py-3">{lookups.technicalName(product.technicalId)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {product.skus.map((sku) => (
                    <Badge key={sku.id} tone={sku.active ? 'info' : 'neutral'}>
                      {sku.packLabel} × {sku.unitsPerBox}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">{formatPercent(product.taxBp)}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={product.active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
