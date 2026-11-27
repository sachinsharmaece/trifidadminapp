import type { ReactNode } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { SearchInput } from '@/components/molecules/SearchInput';

interface RegisterFiltersProps {
  from: string;
  to: string;
  search: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  /** "Download CSV": the page runs the download and says whether it is busy. */
  onDownload: () => void;
  downloading: boolean;
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}): ReactNode {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <Input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-40"
      />
    </label>
  );
}

/** The bar above a register: from and to dates, a search box and the CSV button. */
export function RegisterFilters(props: RegisterFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateField label="From" value={props.from} onChange={props.onFromChange} max={props.to} />
      <DateField label="To" value={props.to} onChange={props.onToChange} min={props.from} />
      <SearchInput
        value={props.search}
        onChange={props.onSearchChange}
        placeholder="Search"
        aria-label={props.searchLabel}
        className="w-full sm:w-64"
      />
      <Button
        variant="secondary"
        onClick={props.onDownload}
        loading={props.downloading}
        className="sm:ml-auto"
      >
        Download CSV
      </Button>
    </div>
  );
}
