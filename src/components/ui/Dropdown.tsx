import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export interface DropdownOption {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** A menu button. Arrow keys move through the items, Enter picks, Esc closes back to the button. */
export function Dropdown({ label, options }: { label: ReactNode; options: DropdownOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function focusItem(index: number): void {
    const count = options.length;
    if (count === 0) return;
    itemRefs.current[(index + count) % count]?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(options.length - 1);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        buttonRef.current?.focus();
      }
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const target = event.key === 'ArrowDown' ? 0 : options.length - 1;
            requestAnimationFrame(() => focusItem(target));
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {label}
        <FiChevronDown aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-30 mt-1 max-h-72 min-w-44 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <button
              key={option.label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm outline-none hover:bg-slate-50 focus:bg-slate-100 ${
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
