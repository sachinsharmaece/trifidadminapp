import { useEffect, useRef } from 'react';

/**
 * Runs `load` once when the page opens (the reference pages fetch their lists this way).
 * The latest `load` is kept in a ref, so the page can pass a plain function without listing dependencies.
 */
export function useOnMount(load: () => Promise<unknown>): void {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    void loadRef.current();
  }, []);
}
