import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { confirmPassword } from '@/features/auth/api';
import { queryClient } from '@/services/query/queryClient';
import {
  addProof,
  buildBatch,
  cancelBatch,
  getPayables,
  listBatches,
  releaseBatch,
  type BatchListParams,
  type BuildBatchInput,
  type PayoutBatch,
  type PayoutLine,
  type ProofInput,
} from './api';

/** Under ['trades'], so a payout also refreshes deal cards, purchase orders, orders and the Payouts lists. */
const payoutsKey = ['trades', 'payouts'] as const;
const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ['trades'] });
  void queryClient.invalidateQueries({ queryKey: ['ledgers'] });
};

export function usePayables() {
  return useQuery({
    queryKey: [...payoutsKey, 'payables'],
    queryFn: ({ signal }) => getPayables(signal),
    staleTime: 0, // the dock or Purchase may just have made something payable
  });
}

export function useBatches(params: BatchListParams) {
  return useQuery({
    queryKey: [...payoutsKey, 'batches', params],
    queryFn: ({ signal }) => listBatches(params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useBuildBatch() {
  return useMutation({
    mutationFn: (input: BuildBatchInput) => buildBatch(input),
    onSettled: refresh, // also after a 409: someone else may have taken one of the lines
  });
}

/** The server wants a recent password check for a release (step-up): the password is checked first. */
export function useReleaseBatch() {
  return useMutation({
    mutationFn: async (input: { batch: PayoutBatch; password: string }) => {
      await confirmPassword(input.password);
      return releaseBatch(input.batch);
    },
    onSettled: refresh,
  });
}

export function useCancelBatch() {
  return useMutation({
    mutationFn: (batch: PayoutBatch) => cancelBatch(batch),
    onSettled: refresh,
  });
}

export function useAddProof() {
  return useMutation({
    mutationFn: (input: { batch: PayoutBatch; line: PayoutLine; proof: ProofInput }) =>
      addProof(input.batch, input.line, input.proof),
    onSettled: refresh,
  });
}
