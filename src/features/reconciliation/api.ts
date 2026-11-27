import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/**
 * Bank reconciliation: for one bank account and one day, Accounts types the closing balance printed on the bank's
 * own statement. The server works out what the books say and the difference. Only a difference of zero can be
 * marked reconciled; after that nothing can be dated on or before that day for that bank account.
 * Balances are signed rupees in paise: positive = money in the bank.
 */
const bankSchema = z.object({
  bankLedgerId: z.string(),
  name: z.string(),
  lastReconciledOn: z.string().nullable(),
  /** Entries in the books after the last reconciled day. */
  entriesSince: z.number(),
  booksPaise: z.number(),
});
export type ReconcileBank = z.infer<typeof bankSchema>;

const reconciliationSchema = z.object({
  id: z.string(),
  bankLedgerId: z.string(),
  bankName: z.string(),
  date: z.string(),
  statementClosingPaise: z.number(),
  ledgerClosingPaise: z.number(),
  differencePaise: z.number(),
  status: z.enum(['OPEN', 'RECONCILED']),
  version: z.number(),
  enteredBy: z.string().nullable(),
  reconciledBy: z.string().nullable(),
  reconciledAt: z.string().nullable(),
});
export type Reconciliation = z.infer<typeof reconciliationSchema>;

export async function getReconciliations(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/bank-reconciliations', { signal });
  return z
    .object({ banks: z.array(bankSchema), history: z.array(reconciliationSchema) })
    .parse(data);
}

export interface ReconcileInput {
  bankLedgerId: string;
  date: string;
  statementClosingPaise: number;
}

/** Saves (or retypes) the statement balance for a day. It stays OPEN until the difference is zero and it is marked. */
export async function saveReconciliation(input: ReconcileInput) {
  const { data } = await apiClient.post<unknown>('/bank-reconciliations', input);
  return z.object({ reconciliation: reconciliationSchema }).parse(data).reconciliation;
}

export async function markReconciled(row: Reconciliation) {
  const { data } = await apiClient.post<unknown>(`/bank-reconciliations/${row.id}/mark`, {
    version: row.version,
  });
  return z.object({ reconciliation: reconciliationSchema }).parse(data).reconciliation;
}
