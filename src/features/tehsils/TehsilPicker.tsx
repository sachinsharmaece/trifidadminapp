import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import type { FieldControlProps } from '@/components/molecules/FormField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { tehsilLabel, type TehsilSummary } from './api';
import { useTehsils } from './hooks';

interface TehsilPickerProps {
  /** The chosen tehsil, or null when none is chosen yet. */
  value: TehsilSummary | null;
  onChange: (tehsil: TehsilSummary) => void;
  /** From FormField, so the search box is tied to its label and error message. */
  field: FieldControlProps;
}

/**
 * Pick one tehsil. There can be thousands, so nothing is listed until the person types
 * (a name, a district or a 6-digit pincode). Only tehsils that are turned on can be chosen.
 */
export function TehsilPicker({ value, onChange, field }: TehsilPickerProps) {
  const [search, setSearch] = useState('');
  const [changing, setChanging] = useState(false);
  const q = useDebouncedValue(search.trim());
  const searching = q.length >= 2;
  const results = useTehsils({ q, page: 1, pageSize: 8, active: true }, searching);

  if (value && !changing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span id={field.id}>{tehsilLabel(value)}</span>
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
        placeholder="Type a tehsil, district or pincode"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!searching && <p className="text-xs text-slate-500">Type at least 2 letters or digits.</p>}
      {searching && results.isError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          Could not search tehsils. {results.error.message}
        </p>
      )}
      {searching && results.isSuccess && results.data.tehsils.length === 0 && (
        <p className="text-xs text-slate-500">No tehsil found. Ask an admin to add it.</p>
      )}
      {searching && results.isSuccess && results.data.tehsils.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {results.data.tehsils.map((tehsil) => (
            <li key={tehsil.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange({
                    id: tehsil.id,
                    name: tehsil.name,
                    district: tehsil.district,
                    state: tehsil.state,
                  });
                  setSearch('');
                  setChanging(false);
                }}
              >
                {tehsilLabel(tehsil)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
          Keep {value.name}
        </Button>
      )}
    </div>
  );
}
