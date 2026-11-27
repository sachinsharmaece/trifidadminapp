import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/** The nightly integrity check (server: modules/system). */

const runSchema = z.object({
  id: z.string(),
  trigger: z.enum(['SCHEDULE', 'MANUAL']),
  startedAt: z.string(),
  finishedAt: z.string(),
  status: z.enum(['OK', 'FINDINGS', 'FAILED']),
  checked: z.object({
    salesOrders: z.number(),
    purchaseOrders: z.number(),
    receipts: z.number(),
    vouchers: z.number(),
  }),
  findingCount: z.number(),
  findings: z.array(z.object({ check: z.string(), ref: z.string(), message: z.string() })),
  error: z.string().nullable(),
});
export type IntegrityRun = z.infer<typeof runSchema>;

const integritySchema = z.object({
  last: runSchema.nullable(),
  history: z.array(
    z.object({
      id: z.string(),
      trigger: z.enum(['SCHEDULE', 'MANUAL']),
      startedAt: z.string(),
      status: z.enum(['OK', 'FINDINGS', 'FAILED']),
      findingCount: z.number(),
    }),
  ),
});
export type Integrity = z.infer<typeof integritySchema>;

export async function getIntegrity(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/system/integrity', { signal });
  return integritySchema.parse(data);
}

/** Runs the check now and answers with the result. */
export async function runIntegrity() {
  const { data } = await apiClient.post<unknown>('/system/integrity/run');
  return z.object({ run: runSchema }).parse(data).run;
}
