import type { ComponentProps } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { cn } from '@/lib/cn';

interface SearchInputProps extends Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> {
  value: string;
  onChange: (value: string) => void;
}

/** A controlled search box with a magnifier and a clear button. `onChange` gets the text, not the event. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  'aria-label': ariaLabel = 'Search',
  className,
  ...rest
}: SearchInputProps) {
  return (
    <div role="search" className={cn('relative', className)}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <Input
        {...rest}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        // Hide the browser's own clear icon; we draw ours so it looks the same everywhere.
        className="px-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-700"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
