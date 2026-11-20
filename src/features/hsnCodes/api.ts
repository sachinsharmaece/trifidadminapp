import { z } from 'zod';
import { apiClient } from '@/services/api/client';

const hsnCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  /** GST rate in basis points: 1800 is 18%. */
  gstBp: z.number(),
  active: z.boolean(),
});

export type HsnCode = z.infer<typeof hsnCodeSchema>;

const listSchema = z.object({ hsnCodes: z.array(hsnCodeSchema) });
const oneSchema = z.object({ hsnCode: hsnCodeSchema });

export async function listHsnCodes(signal?: AbortSignal): Promise<HsnCode[]> {
  const { data } = await apiClient.get<unknown>('/hsn-codes', { signal });
  return listSchema.parse(data).hsnCodes;
}

export async function createHsnCode(input: {
  code: string;
  description: string;
  gstBp: number;
}): Promise<HsnCode> {
  const { data } = await apiClient.post<unknown>('/hsn-codes', input);
  return oneSchema.parse(data).hsnCode;
}

/** The code itself cannot be changed: products point at it. */
export async function updateHsnCode(
  id: string,
  changes: { description?: string; gstBp?: number; active?: boolean },
): Promise<HsnCode> {
  const { data } = await apiClient.patch<unknown>(`/hsn-codes/${id}`, changes);
  return oneSchema.parse(data).hsnCode;
}
