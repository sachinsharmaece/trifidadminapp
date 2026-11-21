import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import type { FieldControlProps } from '@/components/molecules/FormField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSellers } from './hooks';

/** The few things about a seller that a form needs to show the choice. */
export interface SellerChoice {
  id: string;
  number: string;
  firmName: string;
}

interface SellerPickerProps {
  /** The chosen seller, or null when none is chosen yet. */
  value: SellerChoice | null;
  onChange: (seller: SellerChoice) => void;
  /** From FormField, so the search box is tied to its label and error message. */
  field: FieldControlProps;
}

const sellerLabel = (seller: SellerChoice) => `${seller.number} · ${seller.firmName}`;

/**
 * Pick one seller. There can be thousands, so nothing is listed until the person types
 * (a number, or part of the firm name, contact, mobile or GSTIN). Only sellers that are turned on can be chosen.
 */
export function SellerPicker({ value, onChange, field }: SellerPickerProps) {
  const [search, setSearch] = useState('');
  const [changing, setChanging] = useState(false);
  const q = useDebouncedValue(search.trim());
  const searching = q.length >= 2;
  const results = useSellers({ q, page: 1, pageSize: 8, active: true }, searching);

  if (value && !changing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span id={field.id}>{sellerLabel(value)}</span>
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
        placeholder="Type a seller number or firm name"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!searching && <p className="text-xs text-slate-500">Type at least 2 letters or digits.</p>}
      {searching && results.isError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          Could not search sellers. {results.error.message}
        </p>
      )}
      {searching && results.isSuccess && results.data.sellers.length === 0 && (
        <p className="text-xs text-slate-500">No active seller found. Add the seller first.</p>
      )}
      {searching && results.isSuccess && results.data.sellers.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {results.data.sellers.map((seller) => (
            <li key={seller.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange({ id: seller.id, number: seller.number, firmName: seller.firmName });
                  setSearch('');
                  setChanging(false);
                }}
              >
                {sellerLabel(seller)}
                <span className="block text-xs text-slate-500">{seller.tehsil.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
          Keep {value.number}
        </Button>
      )}
    </div>
  );
}
