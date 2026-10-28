import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/errors';

/**
 * 29 Oct — a list the server hands out a page at a time (`cursor` →
 * `nextCursor`), as Registrations does. `loadPage` is called with no cursor
 * for the first page whenever it changes (a new search or filter), then with
 * the cursor for each further page. A newer search makes an older answer
 * stale, so late answers are dropped.
 */
export interface Page<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
  meta?: Record<string, unknown>;
}

export function usePagedList<T>(loadPage: (cursor?: string) => Promise<Page<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [total, setTotal] = useState<number | undefined>();
  const [meta, setMeta] = useState<Record<string, unknown> | undefined>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = (generation.current += 1);
    setStatus('loading');
    setError(null);
    try {
      const page = await loadPage();
      if (mine !== generation.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      setMeta(page.meta);
      setStatus('ready');
    } catch (caught) {
      if (mine !== generation.current) return;
      setError(caught instanceof ApiError ? caught.message : 'Could not load this list.');
      setStatus('error');
    }
  }, [loadPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    try {
      const page = await loadPage(nextCursor);
      if (mine !== generation.current) return;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      if (page.total !== undefined) setTotal(page.total);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage, nextCursor, loadingMore]);

  return {
    items,
    total,
    meta,
    status,
    error,
    loadingMore,
    hasMore: Boolean(nextCursor),
    loadMore,
    reload,
  };
}

/**
 * 29 Oct — a list already loaded in full (a computed board or funnel), shown a
 * page at a time so a long one stays quick; starts again from the top when
 * `resetKey` changes (a new search).
 */
export function useShownList<T>(items: T[], pageSize = 50, resetKey: unknown = null) {
  const [shown, setShown] = useState(pageSize);
  useEffect(() => setShown(pageSize), [resetKey, pageSize]);
  return {
    visible: items.slice(0, shown),
    total: items.length,
    hasMore: shown < items.length,
    showMore: () => setShown((n) => n + pageSize),
  };
}

/** Wait for a pause in typing before using a search term. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
