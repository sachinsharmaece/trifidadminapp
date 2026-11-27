import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { getIntegrity, runIntegrity } from './api';

export function useIntegrity() {
  return useQuery({
    queryKey: ['trades', 'integrity'],
    queryFn: ({ signal }) => getIntegrity(signal),
    staleTime: 0,
  });
}

/** "Run the check now": afterwards the page and the dashboard tile show the new result. */
export function useRunIntegrity() {
  return useMutation({
    mutationFn: runIntegrity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });
}
