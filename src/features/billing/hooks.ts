import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { MargBillInput } from '@/features/trades/api';
import { queryClient } from '@/services/query/queryClient';
import { listToBeBilled, recordMargBill, type BillingParams, type BillingRow } from './api';

/** Under ['trades'], so a Marg bill also refreshes deal cards, orders and the Trips lists. */
const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ['trades'] });
  void queryClient.invalidateQueries({ queryKey: ['ledgers'] });
};

export function useToBeBilled(params: BillingParams) {
  return useQuery({
    queryKey: ['trades', 'to-be-billed', params],
    queryFn: ({ signal }) => listToBeBilled(params, signal),
    staleTime: 0, // the dock may have just checked an order
    placeholderData: keepPreviousData,
  });
}

export function useRecordMargBill() {
  return useMutation({
    mutationFn: (input: { row: BillingRow; bill: MargBillInput }) =>
      recordMargBill(input.row, input.bill),
    onSettled: refresh,
  });
}
