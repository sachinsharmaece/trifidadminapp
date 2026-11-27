import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { confirmPassword } from '@/features/auth/api';
import { refreshBooks } from '@/features/journals/hooks';
import { getVoucher, listVouchers, reverseVoucher, type VoucherListParams } from './api';

export function useVouchers(params: VoucherListParams) {
  return useQuery({
    queryKey: ['vouchers', params],
    queryFn: ({ signal }) => listVouchers(params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

/** The lines of one voucher, loaded when its row is opened. */
export function useVoucher(id: string | null) {
  return useQuery({
    queryKey: ['vouchers', 'one', id],
    queryFn: ({ signal }) => getVoucher(id ?? '', signal),
    enabled: id !== null,
    staleTime: 0,
  });
}

/** Reversing is a "sensitive" step: the person types their password again first (step-up). */
export function useReverseVoucher() {
  return useMutation({
    mutationFn: async (input: { id: string; reason: string; password: string }) => {
      await confirmPassword(input.password);
      return reverseVoucher(input.id, input.reason);
    },
    onSettled: refreshBooks,
  });
}
