import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { createHsnCode, listHsnCodes, updateHsnCode } from './api';

const hsnCodesKey = ['hsn-codes'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadHsnCodes = () => queryClient.invalidateQueries({ queryKey: hsnCodesKey });

export function useHsnCodes() {
  return useQuery({ queryKey: hsnCodesKey, queryFn: ({ signal }) => listHsnCodes(signal) });
}

export function useCreateHsnCode() {
  return useMutation({ mutationFn: createHsnCode, onSuccess: reloadHsnCodes });
}

export function useUpdateHsnCode() {
  return useMutation({
    mutationFn: (input: {
      id: string;
      changes: { description?: string; gstBp?: number; active?: boolean };
    }) => updateHsnCode(input.id, input.changes),
    onSuccess: reloadHsnCodes,
  });
}
