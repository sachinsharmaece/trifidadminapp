import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { createLedger, getStatement, listLedgers, updateLedger, type LedgerRow } from './api';

const ledgersKey = ['ledgers'] as const;

export function useLedgers(q: string) {
  return useQuery({
    queryKey: [...ledgersKey, q],
    queryFn: ({ signal }) => listLedgers(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useStatement(id: string) {
  return useQuery({
    queryKey: [...ledgersKey, 'statement', id],
    queryFn: ({ signal }) => getStatement(id, signal),
  });
}

const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ledgersKey });
  void queryClient.invalidateQueries({ queryKey: ['journals', 'ledger-choices'] });
};

export function useCreateLedger() {
  return useMutation({
    mutationFn: (input: { name: string; group: string }) => createLedger(input),
    onSettled: refresh,
  });
}

export function useUpdateLedger() {
  return useMutation({
    mutationFn: (input: { ledger: LedgerRow; name?: string; active?: boolean }) =>
      updateLedger(input.ledger, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      }),
    onSettled: refresh,
  });
}
