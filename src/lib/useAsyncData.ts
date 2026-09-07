import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/errors';

/**
 * ARCHITECTURE.md §7.2 — every screen that loads data handles all eight
 * states: loading, success, empty, validation error, authorization error,
 * authentication error, server error, network failure.
 */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'validation_error'; message: string }
  | { status: 'authorization_error'; message: string }
  | { status: 'authentication_error' }
  | { status: 'server_error'; message: string; retryable: boolean }
  | { status: 'network_error' };

function toAsyncState<T>(error: unknown): AsyncState<T> {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return { status: 'network_error' };
      case 'VALIDATION_FAILED':
        return { status: 'validation_error', message: error.message };
      case 'PERMISSION_DENIED':
      case 'NOT_VISIBLE':
        return { status: 'authorization_error', message: error.message };
      case 'REAUTH_REQUIRED':
      case 'SESSION_REPLACED':
        return { status: 'authentication_error' };
      default:
        return { status: 'server_error', message: error.message, retryable: error.retryable };
    }
  }
  return {
    status: 'server_error',
    message: 'Something went wrong. Please try again.',
    retryable: true,
  };
}

/**
 * Loads data through `loader` and exposes it as one of the eight states
 * above. `isEmpty` decides whether a successful, empty result renders as
 * "empty" rather than "success" — for a list screen this is usually
 * `(items) => items.length === 0`.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  isEmpty: (data: T) => boolean,
  deps: unknown[],
): { state: AsyncState<T>; retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    loader()
      .then((data) => {
        setState(isEmpty(data) ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((error: unknown) => {
        setState(toAsyncState<T>(error));
      });
  }, [...deps, retryCount]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  return { state, retry };
}
