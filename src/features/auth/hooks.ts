import { useMutation, useQuery } from '@tanstack/react-query';
import { currentUserKey, queryClient } from '@/services/query/queryClient';
import { changePassword, fetchCurrentUser, login, logout } from './api';

/** The signed-in user: `undefined` while loading, `null` when signed out. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
  });
}

/**
 * Whether the signed-in person may add or change products, manufacturers, technicals and HSN codes.
 * It only hides the buttons: the server enforces the same rule (modules/masters/permissions.ts).
 */
export function useCanEditMasters(): boolean {
  const { data: me } = useCurrentUser();
  return me?.role === 'FOUNDER' || me?.role === 'ADMIN';
}

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      login(credentials.email, credentials.password),
    // Saving the user is what makes the app switch from the login page to the dashboard.
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (passwords: { currentPassword: string; newPassword: string }) =>
      changePassword(passwords.currentPassword, passwords.newPassword),
    // The returned user has mustChangePassword = false, so the rest of the app opens up.
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
