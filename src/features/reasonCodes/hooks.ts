import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { createReasonCode, listReasonCodes, updateReasonCode } from './api';

const reasonCodesKey = ['reason-codes'] as const;

/** After any change, reload the list so the table shows what the server now has. */
const reloadReasonCodes = () => queryClient.invalidateQueries({ queryKey: reasonCodesKey });

export function useReasonCodes() {
  return useQuery({
    queryKey: reasonCodesKey,
    queryFn: ({ signal }) => listReasonCodes(signal),
  });
}

export function useCreateReasonCode() {
  return useMutation({ mutationFn: createReasonCode, onSuccess: reloadReasonCodes });
}

export function useUpdateReasonCode() {
  return useMutation({
    mutationFn: (input: {
      id: string;
      changes: { label?: string; sort?: number; active?: boolean };
    }) => updateReasonCode(input.id, input.changes),
    onSuccess: reloadReasonCodes,
  });
}
