import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * 3 Nov (My view sheet) — a list's search, filters and sort live in the URL, so opening a row and
 * coming back (browser Back) shows the same list, and the link can be shared. Typing and picking a
 * filter replace the current history entry rather than adding one, so Back leaves the list instead
 * of stepping through every keystroke.
 *
 * The desk's own tab link points at the bare path, which would drop the filters; so the last query
 * is also remembered for the session (per `key`) and put back when the list opens on a bare URL.
 * Session storage is only a convenience: every read and write is guarded, and the list works
 * without it.
 */
const STORAGE_PREFIX = 'trifid.list.';

function readRemembered(key: string): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeRemembered(key: string, query: string): void {
  try {
    if (query) window.sessionStorage.setItem(STORAGE_PREFIX + key, query);
    else window.sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Private window, blocked storage — the URL still carries the state.
  }
}

export function useListParams<K extends string>(
  key: string,
  defaults: Readonly<Record<K, string>>,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const names = useMemo(() => Object.keys(defaults) as K[], [defaults]);

  // True for the first render only, when the list opens on a bare URL and a query was remembered.
  const [restoring, setRestoring] = useState(
    () => !names.some((name) => searchParams.has(name)) && Boolean(readRemembered(key)),
  );
  // The router applies a URL change a moment after it is asked for, so `restoring` ends only once
  // the URL really carries the remembered query — never earlier, or the list would open unfiltered.
  const asked = useRef(false);
  useEffect(() => {
    if (!restoring) return;
    const remembered = readRemembered(key);
    if (!remembered) {
      setRestoring(false);
      return;
    }
    const wanted = new URLSearchParams(remembered);
    if (searchParams.toString() === wanted.toString()) {
      setRestoring(false);
    } else if (!asked.current) {
      asked.current = true;
      setSearchParams(wanted, { replace: true });
    }
  }, [restoring, key, searchParams, setSearchParams]);

  useEffect(() => {
    if (!restoring) writeRemembered(key, searchParams.toString());
  }, [key, restoring, searchParams]);

  const values = useMemo(
    () =>
      Object.fromEntries(
        names.map((name) => [name, searchParams.get(name) ?? defaults[name]]),
      ) as Record<K, string>,
    [names, defaults, searchParams],
  );

  /** Change some values; a value equal to its default (or empty) is dropped from the URL. */
  const set = useCallback(
    (patch: Partial<Record<K, string>>, options: { push?: boolean } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const name of Object.keys(patch) as K[]) {
            const value = patch[name];
            if (value === undefined || value === '' || value === defaults[name]) next.delete(name);
            else next.set(name, value);
          }
          return next;
        },
        { replace: !options.push },
      );
    },
    [setSearchParams, defaults],
  );

  /** Start the list afresh with only these values (a new tab, say); everything else back to default. */
  const reset = useCallback(
    (patch: Partial<Record<K, string>> = {}, options: { push?: boolean } = {}) => {
      const next = new URLSearchParams();
      for (const name of Object.keys(patch) as K[]) {
        const value = patch[name];
        if (value !== undefined && value !== '' && value !== defaults[name]) next.set(name, value);
      }
      setSearchParams(next, { replace: !options.push });
    },
    [setSearchParams, defaults],
  );

  return { values, set, reset, restoring };
}
