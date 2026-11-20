import { z } from 'zod';
import { apiClient } from './client';

/** Response of GET /ready on trifidserverapp. */
const readinessSchema = z.object({
  status: z.enum(['ready', 'unavailable']),
  checks: z.object({ database: z.enum(['up', 'down']), shuttingDown: z.boolean() }),
});

export type Readiness = z.infer<typeof readinessSchema>;

/**
 * Asks the API whether it is up and connected to MongoDB.
 * A 503 ("unavailable") still has a useful body, so it is accepted as an answer instead of an error.
 */
export async function fetchReadiness(signal?: AbortSignal): Promise<Readiness> {
  const { data } = await apiClient.get<unknown>('/ready', {
    signal,
    validateStatus: (status) => status === 200 || status === 503,
  });
  return readinessSchema.parse(data);
}
