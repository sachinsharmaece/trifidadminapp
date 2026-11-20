import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { createManufacturer, listManufacturers, updateManufacturer } from './api';

const manufacturersKey = ['manufacturers'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadManufacturers = () => queryClient.invalidateQueries({ queryKey: manufacturersKey });

export function useManufacturers() {
  return useQuery({
    queryKey: manufacturersKey,
    queryFn: ({ signal }) => listManufacturers(signal),
  });
}

export function useCreateManufacturer() {
  return useMutation({ mutationFn: createManufacturer, onSuccess: reloadManufacturers });
}

export function useUpdateManufacturer() {
  return useMutation({
    mutationFn: (input: { id: string; changes: { name?: string; active?: boolean } }) =>
      updateManufacturer(input.id, input.changes),
    onSuccess: reloadManufacturers,
  });
}
