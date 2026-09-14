import type { ReactNode } from 'react';
import type { AsyncState } from '../lib/useAsyncData';
import { Loader } from './ui/Loader';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  onRetry: () => void;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}

/**
 * Renders the eight states from ARCHITECTURE.md §7.2 for one screen. Every
 * screen that loads data wraps its content in this instead of writing its
 * own loading/error branches. Restyled to the shared `ui` component set —
 * the API and the state machine itself are unchanged.
 */
export function AsyncBoundary<T>({
  state,
  onRetry,
  emptyMessage,
  children,
}: AsyncBoundaryProps<T>) {
  switch (state.status) {
    case 'loading':
      return <Loader />;
    case 'success':
      return <>{children(state.data)}</>;
    case 'empty':
      return <EmptyState message={emptyMessage ?? 'Nothing here yet.'} />;
    case 'validation_error':
      return <ErrorState message={state.message} />;
    case 'authorization_error':
      return <ErrorState message={`You do not have access to this. ${state.message}`} />;
    case 'authentication_error':
      // A parent RequireAuth catches this via the session going anonymous
      // and redirects to /login; this is the fallback if rendered standalone.
      return <ErrorState message="Your session has expired. Please sign in again." />;
    case 'network_error':
      return (
        <ErrorState
          message="Could not reach the server. Check your connection."
          onRetry={onRetry}
          network
        />
      );
    case 'server_error':
      return <ErrorState message={state.message} onRetry={state.retryable ? onRetry : undefined} />;
    default:
      return null;
  }
}
