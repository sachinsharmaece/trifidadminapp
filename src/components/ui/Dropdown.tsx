import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export interface DropdownOption {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function Dropdown({ label, options }: { label: ReactNode; options: DropdownOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        {label}
        <FiChevronDown aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                option.danger ? 'text-danger-500' : 'text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
