import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  createTehsil,
  listTehsils,
  updateTehsil,
  type TehsilInput,
  type TehsilListParams,
} from './api';

const tehsilsKey = ['tehsils'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadTehsils = () => queryClient.invalidateQueries({ queryKey: tehsilsKey });

export function useTehsils(params: TehsilListParams, enabled = true) {
  return useQuery({
    queryKey: [...tehsilsKey, params],
    queryFn: ({ signal }) => listTehsils(params, signal),
    enabled,
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useCreateTehsil() {
  return useMutation({ mutationFn: createTehsil, onSuccess: reloadTehsils });
}

export function useUpdateTehsil() {
  return useMutation({
    mutationFn: (input: { id: string; changes: Partial<TehsilInput> & { active?: boolean } }) =>
      updateTehsil(input.id, input.changes),
    onSuccess: reloadTehsils,
  });
}
