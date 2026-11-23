import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import type { FieldControlProps } from '@/components/molecules/FormField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from './hooks';

/** The few things about a pack that a form needs to show the choice. */
export interface SkuChoice {
  id: string;
  productId: string;
  productName: string;
  packLabel: string;
  unitsPerBox: number;
}

interface SkuPickerProps {
  /** The chosen pack, or null when none is chosen yet. */
  value: SkuChoice | null;
  onChange: (sku: SkuChoice) => void;
  /** From FormField, so the search box is tied to its label and error message. */
  field: FieldControlProps;
}

export const skuLabel = (sku: SkuChoice) =>
  `${sku.productName} · ${sku.packLabel} (${sku.unitsPerBox} per box)`;

/**
 * Pick one pack of a product. The person types part of the product name and then taps the pack.
 * Products and packs that are turned off are not offered.
 */
export function SkuPicker({ value, onChange, field }: SkuPickerProps) {
  const [search, setSearch] = useState('');
  const [changing, setChanging] = useState(false);
  const q = useDebouncedValue(search.trim());
  const searching = q.length >= 2;
  const results = useProducts({ q, page: 1, pageSize: 6 }, searching);

  // One button per active pack of every active product.
  const choices: SkuChoice[] = results.isSuccess
    ? results.data.products
        .filter((product) => product.active)
        .flatMap((product) =>
          product.skus
            .filter((sku) => sku.active)
            .map((sku) => ({
              id: sku.id,
              productId: product.id,
              productName: product.name,
              packLabel: sku.packLabel,
              unitsPerBox: sku.unitsPerBox,
            })),
        )
    : [];

  if (value && !changing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span id={field.id}>{skuLabel(value)}</span>
        <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        {...field}
        type="search"
        autoComplete="off"
        placeholder="Type a product name"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!searching && <p className="text-xs text-slate-500">Type at least 2 letters.</p>}
      {searching && results.isError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          Could not search products. {results.error.message}
        </p>
      )}
      {searching && results.isSuccess && choices.length === 0 && (
        <p className="text-xs text-slate-500">No active product pack found.</p>
      )}
      {searching && choices.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {choices.map((sku) => (
            <li key={sku.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange(sku);
                  setSearch('');
                  setChanging(false);
                }}
              >
                {skuLabel(sku)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
          Keep this pack
        </Button>
      )}
    </div>
  );
}
