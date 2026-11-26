import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  createBankAccount,
  listBankAccounts,
  updateBankAccount,
  type BankAccount,
  type BankAccountInput,
} from './api';

const bankAccountsKey = ['bank-accounts'] as const;
const reload = () => queryClient.invalidateQueries({ queryKey: bankAccountsKey });

/** `onlyActive`: just the accounts that can receive payments (for Sales' "Enter payment"). */
export function useBankAccounts(onlyActive = false) {
  return useQuery({
    queryKey: [...bankAccountsKey, onlyActive],
    queryFn: ({ signal }) => listBankAccounts(onlyActive, signal),
  });
}

export function useCreateBankAccount() {
  return useMutation({ mutationFn: createBankAccount, onSuccess: reload });
}

export function useUpdateBankAccount() {
  return useMutation({
    mutationFn: (input: {
      account: BankAccount;
      changes: Partial<BankAccountInput> & { active?: boolean };
    }) => updateBankAccount(input.account, input.changes),
    onSuccess: reload,
  });
}
