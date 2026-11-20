import type { ReactNode } from 'react';
import { SearchInput } from '@/components/molecules/SearchInput';

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Accessible name of the search box (screen readers). */
  searchLabel?: string;
  /** Extra controls on the right: filters, an "Add" button... */
  children?: ReactNode;
}

/** The bar above any table: search on the left, optional actions on the right. */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  children,
}: DataTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
        className="w-full sm:max-w-xs"
      />
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
