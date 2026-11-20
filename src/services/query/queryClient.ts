import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api/ApiError';

/** Retry a failed query at most twice, and never for 4xx: the server already gave a final answer. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.isClientError) {
    return false;
  }
  return failureCount < 2;
}

/** Cache key of "who is signed in" (see features/auth). `null` there means signed out. */
export const currentUserKey = ['me'] as const;

/** If any call says "not signed in" (for example the session timed out), forget the user: the app then shows the login page. */
function handleSessionEnded(error: Error): void {
  if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
    queryClient.setQueryData(currentUserKey, null);
  }
}

/** The one QueryClient for the app. Server data lives here; local UI state stays in React state. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleSessionEnded }),
  mutationCache: new MutationCache({ onError: handleSessionEnded }),
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data counts as fresh for 30s, so quick page switches do not refetch
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false, // a write must never be silently repeated
    },
  },
});
