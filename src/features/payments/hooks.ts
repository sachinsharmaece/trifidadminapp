import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  confirmPayment,
  listPayments,
  rejectPayment,
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
