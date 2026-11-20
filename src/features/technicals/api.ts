import { z } from 'zod';
import { apiClient } from '@/services/api/client';

const technicalSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  active: z.boolean(),
});

export type Technical = z.infer<typeof technicalSchema>;

const listSchema = z.object({ technicals: z.array(technicalSchema) });
const oneSchema = z.object({ technical: technicalSchema });

export async function listTechnicals(signal?: AbortSignal): Promise<Technical[]> {
  const { data } = await apiClient.get<unknown>('/technicals', { signal });
  return listSchema.parse(data).technicals;
}

export async function createTechnical(input: {
  name: string;
  description: string;
}): Promise<Technical> {
  const { data } = await apiClient.post<unknown>('/technicals', input);
  return oneSchema.parse(data).technical;
}

export async function updateTechnical(
  id: string,
  changes: { name?: string; description?: string; active?: boolean },
): Promise<Technical> {
  const { data } = await apiClient.patch<unknown>(`/technicals/${id}`, changes);
  return oneSchema.parse(data).technical;
}
