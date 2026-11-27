import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { listComplaints, runClocks, type ComplaintListParams } from './api';

/** Under ['trades'], so any deal card button (raise, decide, delivered) also refreshes the list. */
const complaintsKey = ['trades', 'complaints'] as const;

export function useComplaints(params: ComplaintListParams) {
  return useQuery({
    queryKey: [...complaintsKey, params],
    queryFn: ({ signal }) => listComplaints(params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

/** "Run delivery clock now": afterwards every trade list reloads, since some trades moved to b10. */
export function useRunClocks() {
  return useMutation({
    mutationFn: runClocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
}
