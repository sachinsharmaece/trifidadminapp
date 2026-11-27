import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  getReconciliations,
  markReconciled,
  saveReconciliation,
  type Reconciliation,
  type ReconcileInput,
} from './api';

const key = ['reconciliation'] as const;

/** Reconciling changes what the Accounts dashboard shows ("banks to reconcile"), so it is refreshed too. */
const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: key });
  void queryClient.invalidateQueries({ queryKey: ['trades'] });
};

export function useReconciliations() {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getReconciliations(signal),
    staleTime: 0,
  });
}

export function useSaveReconciliation() {
  return useMutation({
    mutationFn: (input: ReconcileInput) => saveReconciliation(input),
    onSettled: refresh,
  });
}

export function useMarkReconciled() {
  return useMutation({
    mutationFn: (row: Reconciliation) => markReconciled(row),
    onSettled: refresh,
  });
}
