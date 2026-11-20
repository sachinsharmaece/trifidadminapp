import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';

interface PaginationProps {
  /** Current page, starting at 1. */
  page: number;
  pageSize: number;
  /** Total number of rows across all pages. */
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 text-sm text-slate-600"
    >
      <p aria-live="polite">
        Showing <span className="font-medium text-slate-900">{firstRow}</span>–
        <span className="font-medium text-slate-900">{lastRow}</span> of{' '}
        <span className="font-medium text-slate-900">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Previous
        </Button>
        <span className="hidden sm:inline">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <Icon name="chevron-right" className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
