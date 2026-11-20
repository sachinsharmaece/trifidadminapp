import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { REASON_CODE_CONTEXTS, type ReasonCodeContext } from '@/types/reasonCode';

const reasonCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  context: z.enum(REASON_CODE_CONTEXTS),
  sort: z.number(),
  active: z.boolean(),
});

export type ReasonCode = z.infer<typeof reasonCodeSchema>;

const listSchema = z.object({ reasonCodes: z.array(reasonCodeSchema) });
const oneSchema = z.object({ reasonCode: reasonCodeSchema });

/** The server sends them by context, then display order, then label. */
export async function listReasonCodes(signal?: AbortSignal): Promise<ReasonCode[]> {
  const { data } = await apiClient.get<unknown>('/reason-codes', { signal });
  return listSchema.parse(data).reasonCodes;
}

export async function createReasonCode(input: {
  code: string;
  label: string;
  context: ReasonCodeContext;
  sort: number;
}): Promise<ReasonCode> {
  const { data } = await apiClient.post<unknown>('/reason-codes', input);
  return oneSchema.parse(data).reasonCode;
}

/** The code and its context cannot be changed once created. */
export async function updateReasonCode(
  id: string,
  changes: { label?: string; sort?: number; active?: boolean },
): Promise<ReasonCode> {
  const { data } = await apiClient.patch<unknown>(`/reason-codes/${id}`, changes);
  return oneSchema.parse(data).reasonCode;
}
