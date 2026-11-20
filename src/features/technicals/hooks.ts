import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { createTechnical, listTechnicals, updateTechnical } from './api';

const technicalsKey = ['technicals'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadTechnicals = () => queryClient.invalidateQueries({ queryKey: technicalsKey });

export function useTechnicals() {
  return useQuery({ queryKey: technicalsKey, queryFn: ({ signal }) => listTechnicals(signal) });
}

export function useCreateTechnical() {
  return useMutation({ mutationFn: createTechnical, onSuccess: reloadTechnicals });
}

export function useUpdateTechnical() {
  return useMutation({
    mutationFn: (input: {
      id: string;
      changes: { name?: string; description?: string; active?: boolean };
    }) => updateTechnical(input.id, input.changes),
    onSuccess: reloadTechnicals,
  });
}
