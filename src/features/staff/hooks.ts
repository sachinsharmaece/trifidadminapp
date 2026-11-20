import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import type { Role } from '@/types/roles';
import { createStaff, listStaff, resetStaffPassword, updateStaff } from './api';

const staffKey = ['staff'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadStaff = () => queryClient.invalidateQueries({ queryKey: staffKey });

export function useStaff() {
  return useQuery({ queryKey: staffKey, queryFn: ({ signal }) => listStaff(signal) });
}

export function useCreateStaff() {
  return useMutation({ mutationFn: createStaff, onSuccess: reloadStaff });
}

export function useUpdateStaff() {
  return useMutation({
    mutationFn: (input: { id: string; changes: { role?: Role; active?: boolean } }) =>
      updateStaff(input.id, input.changes),
    onSuccess: reloadStaff,
  });
}

export function useResetStaffPassword() {
  // Reloading shows the "Temporary password" badge on that person's row.
  return useMutation({ mutationFn: resetStaffPassword, onSuccess: reloadStaff });
}
