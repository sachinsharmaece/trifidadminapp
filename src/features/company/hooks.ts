import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { getCompany, saveCompany } from './api';

const companyKey = ['company'] as const;

export function useCompany() {
  return useQuery({ queryKey: companyKey, queryFn: ({ signal }) => getCompany(signal) });
}

export function useSaveCompany() {
  return useMutation({
    mutationFn: saveCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKey }),
  });
}
