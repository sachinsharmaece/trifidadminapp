import { useMemo, useState } from 'react';

export interface NamePickerOption {
  id: string;
  label: string;
  sublabel?: string | undefined;
}

/** Pick-by-name combobox, copied from the reference (components/forms/NamePicker.tsx). */
export function NamePicker({
  options,
  value,
  onChange,
  placeholder = 'Search by name…',
  ariaLabel,
}: {
  options: NamePickerOption[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <div className="relative">
      <input
        type="text"
        aria-label={ariaLabel}
        value={open ? query : (selected?.label ?? '')}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-zinc-200 bg-white shadow-md"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-zinc-400">No matches</li>}
          {filtered.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.id);
                  setQuery('');
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <span className="text-zinc-900">{o.label}</span>
                {o.sublabel && <span className="text-xs text-zinc-400">{o.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
