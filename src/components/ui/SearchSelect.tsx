import { useEffect, useId, useRef, useState } from 'react';

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Smaller line under the label — e.g. the technical name that tells two brands apart. */
  detail?: string;
}

/**
 * A dropdown you can type into. The caller owns the options (so they can come from the server,
 * as the product list does): `onSearch` fires as the text changes, and `onChange` fires when an
 * option is picked. Arrow keys move, Enter picks, Esc closes; clicking away restores the pick.
 */
export function SearchSelect({
  label,
  required,
  placeholder = 'Type to search…',
  options,
  value,
  selectedLabel,
  loading = false,
  disabled = false,
  onSearch,
  onChange,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: SearchSelectOption[];
  /** The chosen option's value, or '' for none. */
  value: string;
  /** What to show in the box once something is chosen. */
  selectedLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onSearch: (query: string) => void;
  onChange: (value: string, option: SearchSelectOption) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // The box shows what was typed while searching, and the chosen label otherwise.
  const shown = typing ? text : selectedLabel;

  useEffect(() => setActive(0), [options]);

  function close(): void {
    setOpen(false);
    setTyping(false);
    setText('');
  }

  function pick(option: SearchSelectOption): void {
    onChange(option.value, option);
    close();
  }

  useEffect(() => {
    if (!open) return;
    function onDocumentMouseDown(event: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    }
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault(); // Never submit the form from the search box.
      const option = options[active];
      if (option) pick(option);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={shown}
        // Without a pick the field is not valid — `required` on a text box would pass on
        // leftover text, so the form checks the value itself.
        aria-required={required}
        onFocus={() => {
          setOpen(true);
          onSearch(typing ? text : '');
        }}
        onChange={(event) => {
          setText(event.target.value);
          setTyping(true);
          setOpen(true);
          onSearch(event.target.value);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30 disabled:bg-slate-100 disabled:text-slate-400"
        data-selected={value || undefined}
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full min-w-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {loading ? 'Searching…' : 'No match.'}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              // mousedown, not click: the input would lose focus and close the list first.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === active ? 'bg-slate-100' : ''
              } ${option.value === value ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
            >
              <div>{option.label}</div>
              {option.detail && <div className="text-xs text-slate-500">{option.detail}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
