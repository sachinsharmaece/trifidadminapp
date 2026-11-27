import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { downloadFile, type DownloadRequest } from './download';
import {
  getDashboard,
  getPurchaseRegister,
  getSalesRegister,
  getTrialBalance,
  type RegisterParams,
} from './api';

/**
 * All of these sit under ['trades', ...], so any deal card button (a payment confirmed, a Marg bill, a dock check...)
 * also refreshes the registers and the dashboard.
 */
export function useSalesRegister(params: RegisterParams) {
  return useQuery({
    queryKey: ['trades', 'sales-register', params],
    queryFn: ({ signal }) => getSalesRegister(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function usePurchaseRegister(params: RegisterParams) {
  return useQuery({
    queryKey: ['trades', 'purchase-register', params],
    queryFn: ({ signal }) => getPurchaseRegister(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useTrialBalance(asOn: string) {
  return useQuery({
    queryKey: ['trades', 'trial-balance', asOn],
    queryFn: ({ signal }) => getTrialBalance(asOn, signal),
    staleTime: 0,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ['trades', 'dashboard'],
    queryFn: ({ signal }) => getDashboard(signal),
    staleTime: 0,
  });
}

/** A download button: `mutate({ path, params, fallbackName })`. `isPending` and `error` drive the button. */
export function useDownload() {
  return useMutation({ mutationFn: (request: DownloadRequest) => downloadFile(request) });
}
