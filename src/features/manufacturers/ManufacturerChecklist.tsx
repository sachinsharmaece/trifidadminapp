import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { useManufacturers } from './hooks';

interface ManufacturerChecklistProps {
  /** Ids of the ticked manufacturers. */
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}

/**
 * Tick the manufacturers a party is a dealer of. Manufacturers that are turned off are hidden,
 * unless the party already has them ticked (then they stay visible so they can be unticked).
 */
export function ManufacturerChecklist({ selected, onChange }: ManufacturerChecklistProps) {
  const manufacturers = useManufacturers();
  const [filter, setFilter] = useState('');

  if (manufacturers.isPending) return <p className="text-sm text-slate-500">Loading…</p>;
  if (manufacturers.isError) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600">
        Could not load manufacturers. {manufacturers.error.message}
      </p>
    );
  }

  const visible = manufacturers.data.filter((m) => m.active || selected.includes(m.id));
  const shown = visible.filter((m) => m.name.toLowerCase().includes(filter.trim().toLowerCase()));

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-500">No manufacturers yet. Add them under Manufacturers.</p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.length > 8 && (
        <Input
          type="search"
          aria-label="Filter manufacturers"
          placeholder="Filter manufacturers"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
        {shown.length === 0 && <p className="px-1 text-sm text-slate-500">No match.</p>}
        {shown.map((manufacturer) => (
          <label
            key={manufacturer.id}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(manufacturer.id)}
              onChange={() => toggle(manufacturer.id)}
            />
            <span>
              {manufacturer.name}
              {!manufacturer.active && <span className="text-slate-500"> (turned off)</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
