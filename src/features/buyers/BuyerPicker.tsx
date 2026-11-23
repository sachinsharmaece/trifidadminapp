import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import type { FieldControlProps } from '@/components/molecules/FormField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useBuyers } from './hooks';

/** The few things about a buyer that a screen needs to show the choice. */
export interface BuyerChoice {
  id: string;
  number: string;
  firmName: string;
}

interface BuyerPickerProps {
  /** The chosen buyer, or null when none is chosen yet. */
  value: BuyerChoice | null;
  onChange: (buyer: BuyerChoice) => void;
  /** From FormField, so the search box is tied to its label. */
  field: FieldControlProps;
}

const buyerLabel = (buyer: BuyerChoice) => `${buyer.number} · ${buyer.firmName}`;

/**
 * Pick one buyer. There can be thousands, so nothing is listed until the person types
 * (a number, or part of the firm name, contact, mobile or GSTIN). Only buyers that are turned on can be chosen.
 */
export function BuyerPicker({ value, onChange, field }: BuyerPickerProps) {
  const [search, setSearch] = useState('');
  const [changing, setChanging] = useState(false);
  const q = useDebouncedValue(search.trim());
  const searching = q.length >= 2;
  const results = useBuyers({ q, page: 1, pageSize: 8, active: true }, searching);

  if (value && !changing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span id={field.id}>{buyerLabel(value)}</span>
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
        placeholder="Type a buyer number or firm name"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!searching && <p className="text-xs text-slate-500">Type at least 2 letters or digits.</p>}
      {searching && results.isError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          Could not search buyers. {results.error.message}
        </p>
      )}
      {searching && results.isSuccess && results.data.buyers.length === 0 && (
        <p className="text-xs text-slate-500">No active buyer found. Add the buyer first.</p>
      )}
      {searching && results.isSuccess && results.data.buyers.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {results.data.buyers.map((buyer) => (
            <li key={buyer.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange({ id: buyer.id, number: buyer.number, firmName: buyer.firmName });
                  setSearch('');
                  setChanging(false);
                }}
              >
                {buyerLabel(buyer)}
                <span className="block text-xs text-slate-500">{buyer.tehsil.name}</span>
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
