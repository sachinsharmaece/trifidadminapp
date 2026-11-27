import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  addHandPayment,
  confirmPayment,
  listAdvances,
  listPayments,
  rejectPayment,
  searchBuyers,
  spendAdvance,
  type AdvanceOrder,
  type HandPaymentInput,
  type PaymentListParams,
  type PaymentRow,
} from './api';

/** Under ['trades'], so pressing here also refreshes deal cards, funnels, orders and ledgers. */
const paymentsKey = ['trades', 'payments'] as const;
const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ['trades'] });
  void queryClient.invalidateQueries({ queryKey: ['ledgers'] });
};

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: [...paymentsKey, params],
    queryFn: ({ signal }) => listPayments(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useConfirmPayment() {
  return useMutation({
    mutationFn: (row: PaymentRow) => confirmPayment(row),
    onSettled: refresh, // also after a 409: the row may have been handled by someone else
  });
}

export function useRejectPayment() {
  return useMutation({
    mutationFn: (input: { row: PaymentRow; note: string }) => rejectPayment(input.row, input.note),
    onSettled: refresh,
  });
}

export function useAddHandPayment() {
  return useMutation({
    mutationFn: (input: HandPaymentInput) => addHandPayment(input),
    onSettled: refresh,
  });
}

export function useAdvances() {
  return useQuery({
    queryKey: [...paymentsKey, 'advances'],
    queryFn: ({ signal }) => listAdvances(signal),
    staleTime: 0,
  });
}

/** "Use the buyer's advance": presses the engine action for this order. */
export function useSpendAdvance() {
  return useMutation({
    mutationFn: (order: AdvanceOrder) => spendAdvance(order),
    onSettled: refresh,
  });
}

/** Buyers matching what Accounts typed (only asked once there are two letters). */
export function useBuyerChoices(q: string) {
  return useQuery({
    queryKey: [...paymentsKey, 'buyer-choices', q],
    queryFn: ({ signal }) => searchBuyers(q, signal),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}
