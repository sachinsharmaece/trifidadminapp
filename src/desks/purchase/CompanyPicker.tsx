import { useCallback, useMemo, useState } from 'react';
import { getMastersManufacturers, type MasterManufacturer } from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';

/**
 * Tick the companies a seller deals in. Controlled — the caller owns the
 * selected ids, so the same picker serves the seller file (saved on its own)
 * and the Add-a-seller form (saved with the registration).
 */
export function CompanyPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (manufacturerIds: string[]) => void;
  disabled?: boolean;
}) {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getMastersManufacturers(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [search, setSearch] = useState('');

  return (
    <AsyncBoundary
      state={state}
      onRetry={retry}
      emptyMessage="No companies in the master yet — add one from a seller's catalogue page."
    >
      {(companies: MasterManufacturer[]) => (
        <PickerBody
          companies={companies}
          value={value}
          onChange={onChange}
          disabled={disabled}
          search={search}
          onSearch={setSearch}
        />
      )}
    </AsyncBoundary>
  );
}

function PickerBody({
  companies,
  value,
  onChange,
  disabled,
  search,
  onSearch,
}: {
  companies: MasterManufacturer[];
  value: string[];
  onChange: (manufacturerIds: string[]) => void;
  disabled: boolean;
  search: string;
  onSearch: (s: string) => void;
}) {
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...companies]
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          c.aka.some((a) => a.toLowerCase().includes(needle)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, search]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        id="company-picker-search"
        label="Find a company"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Type to narrow the list"
        disabled={disabled}
      />
      <p className="text-xs text-slate-500">
        {value.length} ticked. Every product of a ticked company counts as something he can supply.
      </p>
      {visible.length === 0 ? (
        <p className="text-sm text-slate-500">No company matches “{search}”.</p>
      ) : (
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
          {visible.map((c) => {
            const ticked = value.includes(c.manufacturerId);
            return (
              <label
                key={c.manufacturerId}
                className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-sm ${
                  ticked ? 'border-brand-500 bg-brand-50' : 'border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={ticked}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...value, c.manufacturerId]
                        : value.filter((id) => id !== c.manufacturerId),
                    )
                  }
                />
                {c.name}
                {c.state === 'draft' ? ' (draft)' : ''}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
