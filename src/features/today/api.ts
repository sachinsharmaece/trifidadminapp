import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/** The Controller's Today page: what has run past its time (server: modules/today). */

const tradeRef = z.object({ id: z.string(), number: z.string(), version: z.number() });
const firm = z.object({ number: z.string(), firmName: z.string() });

const todaySchema = z.object({
  /** Goods due at the dock that have not come: the Controller may close them as lost. */
  lostInTransit: z.array(
    z.object({
      trade: tradeRef,
      buyer: firm,
      seller: firm.nullable(),
      poNumber: z.string().nullable(),
      boxes: z.number().nullable(),
      dueAt: z.string(),
    }),
  ),
  /** Every other clock that ran out. They only show; the desk named acts. */
  overdue: z.array(
    z.object({
      trade: tradeRef,
      label: z.string(),
      desk: z.string(),
      stage: z.string(),
      buyer: firm,
      seller: firm.nullable(),
      dueAt: z.string(),
    }),
  ),
  complaints: z.object({ open: z.number(), overdue: z.number() }),
  /** Seller payouts the Controller put on hold. */
  held: z.array(
    z.object({
      poNumber: z.string(),
      seller: firm.nullable(),
      reason: z.string(),
      at: z.string(),
      trade: tradeRef.nullable(),
    }),
  ),
  archiveDays: z.number(),
});
export type Today = z.infer<typeof todaySchema>;
export type LostRow = Today['lostInTransit'][number];

export async function getToday(signal?: AbortSignal): Promise<Today> {
  const { data } = await apiClient.get<unknown>('/today', { signal });
  return todaySchema.parse(data);
}

const clocksSchema = z.object({ delivered: z.number(), archived: z.number() });

/** Runs the clocks now (the server also runs them every 15 minutes). Says what each one did. */
export async function runClocks(): Promise<z.infer<typeof clocksSchema>> {
  const { data } = await apiClient.post<unknown>('/clocks/run');
  return clocksSchema.parse(data);
}
