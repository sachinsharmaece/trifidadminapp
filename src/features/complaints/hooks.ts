import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listComplaints, type ComplaintListParams } from './api';

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
