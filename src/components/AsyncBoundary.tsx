import type { ReactNode } from 'react';
import type { AsyncState } from '../lib/useAsyncData';

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  onRetry: () => void;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}

/**
 * Renders the eight states from ARCHITECTURE.md §7.2 for one screen. Every
 * screen that loads data wraps its content in this instead of writing its
 * own loading/error branches.
 */
export function AsyncBoundary<T>({
  state,
  onRetry,
  emptyMessage,
  children,
}: AsyncBoundaryProps<T>) {
  switch (state.status) {
    case 'loading':
      return (
        <p className="page-state" role="status">
          Loading…
        </p>
      );
    case 'success':
      return <>{children(state.data)}</>;
    case 'empty':
      return <p className="page-state">{emptyMessage ?? 'Nothing here yet.'}</p>;
    case 'validation_error':
      return (
        <div className="page-state page-state--error" role="alert">
          <p>{state.message}</p>
        </div>
      );
    case 'authorization_error':
      return (
        <div className="page-state page-state--error" role="alert">
          <p>You do not have access to this. {state.message}</p>
        </div>
      );
    case 'authentication_error':
      // A parent RequireAuth catches this via the session going anonymous
      // and redirects to /login; this is the fallback if rendered standalone.
      return (
        <div className="page-state page-state--error" role="alert">
          <p>Your session has expired. Please sign in again.</p>
        </div>
      );
    case 'network_error':
      return (
        <div className="page-state page-state--error" role="alert">
          <p>Could not reach the server. Check your connection.</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    case 'server_error':
      return (
        <div className="page-state page-state--error" role="alert">
          <p>{state.message}</p>
          {state.retryable && (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      );
    default:
      return null;
  }
}
