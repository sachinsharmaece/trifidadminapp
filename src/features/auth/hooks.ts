import { useMutation, useQuery } from '@tanstack/react-query';
import { currentUserKey, queryClient } from '@/services/query/queryClient';
import { fetchCurrentUser, login, logout } from './api';

/** The signed-in user: `undefined` while loading, `null` when signed out. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      login(credentials.email, credentials.password),
    // Saving the user is what makes the app switch from the login page to the dashboard.
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Forget everything the previous person could see, then mark "nobody is signed in".
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== currentUserKey[0] });
      queryClient.setQueryData(currentUserKey, null);
    },
  });
}
