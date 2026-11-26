import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getStatement, listLedgers } from './api';

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
