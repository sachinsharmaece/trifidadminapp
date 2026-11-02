import { useEffect, useRef } from 'react';
import { Button } from './ui/Button';

/**
 * 29 Oct — the end of a long list: "Showing N of M", the next page loading as
 * this comes into view (infinite scroll), and a "Load more" button for anyone
 * who prefers to click (or where scrolling does not trigger it).
 */
export function ListFooter({
  shown,
  total,
  hasMore,
  loading = false,
  error,
  onMore,
}: {
  shown: number;
  total?: number;
  hasMore: boolean;
  loading?: boolean;
  error?: string | null;
  onMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const onMoreRef = useRef(onMore);
  onMoreRef.current = onMore;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onMoreRef.current();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div ref={sentinel} className="mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>
          Showing {shown}
          {total !== undefined ? ` of ${total}` : ''}
          {!hasMore && shown > 0 ? ' — that is all' : ''}
        </span>
        {hasMore && (
          <Button variant="secondary" size="sm" loading={loading} onClick={onMore}>
            Load more
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}

/** A search box for the top right of a list. */
export function ListSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full sm:w-80">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
