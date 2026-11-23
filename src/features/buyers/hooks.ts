import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  classifyBuyer,
  createBuyer,
  listBuyers,
  updateBuyer,
  type BuyerChanges,
  type BuyerListParams,
} from './api';

const buyersKey = ['buyers'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadBuyers = () => queryClient.invalidateQueries({ queryKey: buyersKey });

export function useBuyers(params: BuyerListParams, enabled = true) {
  return useQuery({
    queryKey: [...buyersKey, params],
    queryFn: ({ signal }) => listBuyers(params, signal),
    enabled,
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useCreateBuyer() {
  return useMutation({ mutationFn: createBuyer, onSuccess: reloadBuyers });
}

export function useUpdateBuyer() {
  return useMutation({
    mutationFn: (input: { id: string; changes: BuyerChanges }) =>
      updateBuyer(input.id, input.changes),
    onSuccess: reloadBuyers,
  });
}

export function useClassifyBuyer() {
  return useMutation({ mutationFn: classifyBuyer, onSuccess: reloadBuyers });
}
