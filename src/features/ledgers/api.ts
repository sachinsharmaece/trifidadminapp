import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/** Ledgers and statements, worked out by the server from the posted vouchers (read only). */
const balanceSchema = z.object({ paise: z.number(), side: z.enum(['DR', 'CR']) });
export type Balance = z.infer<typeof balanceSchema>;
const kind = z.enum(['BUYER', 'SELLER', 'BANK', 'OTHER']);

const ledgerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string(),
  kind,
  active: z.boolean(),
  /** Made by hand (Build 9): it can be renamed and turned off here. The others are kept where they come from. */
  hand: z.boolean(),
  version: z.number(),
  drPaise: z.number(),
  crPaise: z.number(),
  balance: balanceSchema,
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

const statementSchema = z.object({
  ledger: z.object({ id: z.string(), name: z.string(), group: z.string(), kind }),
  lines: z.array(
    z.object({
      date: z.string(),
      voucherNumber: z.string(),
      voucherType: z.string(),
      narration: z.string(),
      drPaise: z.number(),
      crPaise: z.number(),
      balance: balanceSchema,
    }),
  ),
  totals: z.object({ drPaise: z.number(), crPaise: z.number(), balance: balanceSchema }),
});
export type Statement = z.infer<typeof statementSchema>;

export async function listLedgers(q: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/ledgers', { params: { q }, signal });
  return z.object({ ledgers: z.array(ledgerRowSchema) }).parse(data).ledgers;
}

export async function getStatement(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/ledgers/${id}/statement`, { signal });
  return statementSchema.parse(data);
}

/** A ledger Accounts adds by hand (rent, interest, capital, a loan). */
export async function createLedger(input: { name: string; group: string }) {
  const { data } = await apiClient.post<unknown>('/ledgers', input);
  return z
    .object({ ledger: z.object({ id: z.string(), name: z.string(), group: z.string() }) })
    .parse(data).ledger;
}

/** Rename a hand ledger, or turn it off (only when its balance is zero). The ledger is never deleted. */
export async function updateLedger(ledger: LedgerRow, change: { name?: string; active?: boolean }) {
  const { data } = await apiClient.patch<unknown>(`/ledgers/${ledger.id}`, {
    version: ledger.version,
    ...change,
  });
  return z
    .object({
      ledger: z.object({
        id: z.string(),
        name: z.string(),
        active: z.boolean(),
        version: z.number(),
      }),
    })
    .parse(data).ledger;
}
