import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { getToday, runClocks } from './api';

/** Under ['trades'], so any deal card button (close as lost, hold, release...) also refreshes this page. */
export function useToday() {
  return useQuery({
    queryKey: ['trades', 'today'],
    queryFn: ({ signal }) => getToday(signal),
    staleTime: 0,
  });
}

/** "Run the clocks now": afterwards every trade list reloads, since some trades moved. */
export function useRunClocks() {
  return useMutation({
    mutationFn: runClocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
}
