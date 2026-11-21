import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  createSeller,
  listSellers,
  updateSeller,
  type SellerChanges,
  type SellerListParams,
} from './api';

const sellersKey = ['sellers'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadSellers = () => queryClient.invalidateQueries({ queryKey: sellersKey });

export function useSellers(params: SellerListParams) {
  return useQuery({
    queryKey: [...sellersKey, params],
    queryFn: ({ signal }) => listSellers(params, signal),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useCreateSeller() {
  return useMutation({ mutationFn: createSeller, onSuccess: reloadSellers });
}

export function useUpdateSeller() {
  return useMutation({
    mutationFn: (input: { id: string; changes: SellerChanges }) =>
      updateSeller(input.id, input.changes),
    onSuccess: reloadSellers,
  });
}
