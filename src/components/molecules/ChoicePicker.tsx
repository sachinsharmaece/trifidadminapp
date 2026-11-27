import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { cn } from '@/lib/cn';

interface ChoicePickerProps<Option> {
  /** The words in the box: what the person typed, or the name of what they picked. */
  text: string;
  /** Typing again clears the pick: the parent decides what that means. */
  onTextChange: (text: string) => void;
  /** What matched the words (the parent searches). */
  options: readonly Option[];
  loading?: boolean;
  optionKey: (option: Option) => string;
  optionLabel: (option: Option) => string;
  onPick: (option: Option) => void;
  placeholder?: string;
  emptyText?: string;
  /** Props from FormField (id, aria-describedby, invalid). */
  id?: string;
  'aria-describedby'?: string | undefined;
  invalid?: boolean;
  'aria-label'?: string;
}

/**
 * A search box with a short list under it: type a few letters, click the one you mean. Used where a person must
 * choose one row out of thousands (a buyer, a ledger) and a plain drop-down would be too long.
 */
export function ChoicePicker<Option>(props: ChoicePickerProps<Option>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Input
        id={props.id}
        aria-describedby={props['aria-describedby']}
        aria-label={props['aria-label']}
        invalid={props.invalid ?? false}
        autoComplete="off"
        placeholder={props.placeholder ?? 'Type to search'}
        value={props.text}
        onFocus={() => setOpen(true)}
        // A small delay so a click on a choice lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          props.onTextChange(event.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg',
          )}
        >
          {props.loading && <li className="px-3 py-2 text-slate-500">Searching…</li>}
          {!props.loading && props.options.length === 0 && (
            <li className="px-3 py-2 text-slate-500">{props.emptyText ?? 'Nothing matches.'}</li>
          )}
          {props.options.map((option) => (
            <li key={props.optionKey(option)} role="option" aria-selected={false}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-slate-100"
                onMouseDown={(event) => {
                  event.preventDefault();
                  props.onPick(option);
                  setOpen(false);
                }}
              >
                {props.optionLabel(option)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
