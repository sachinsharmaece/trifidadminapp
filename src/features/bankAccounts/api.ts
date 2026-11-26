import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { BANK_KINDS, type BankKind } from '@/types/books';

/** Our bank accounts (bank ledgers). The account number never comes back: only its last 4 digits. */
const bankAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(BANK_KINDS),
  bankName: z.string(),
  accountLast4: z.string(),
  ifsc: z.string().nullable(),
  active: z.boolean(),
  version: z.number(),
});
export type BankAccount = z.infer<typeof bankAccountSchema>;

const oneSchema = z.object({ bankAccount: bankAccountSchema });

export async function listBankAccounts(onlyActive: boolean, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/bank-accounts', {
    params: onlyActive ? { active: 'true' } : {},
    signal,
  });
  return z.object({ bankAccounts: z.array(bankAccountSchema) }).parse(data).bankAccounts;
}

export interface BankAccountInput {
  name: string;
  kind: BankKind;
  bankName: string;
  ifsc: string;
  /** Required when adding; left out when editing = keep the saved number. */
  accountNumber?: string | undefined;
}

export async function createBankAccount(input: BankAccountInput) {
  const { data } = await apiClient.post<unknown>('/bank-accounts', input);
  return oneSchema.parse(data).bankAccount;
}

export async function updateBankAccount(
  account: BankAccount,
  changes: Partial<BankAccountInput> & { active?: boolean },
) {
  const { data } = await apiClient.patch<unknown>(`/bank-accounts/${account.id}`, {
    ...changes,
    version: account.version,
  });
  return oneSchema.parse(data).bankAccount;
}
