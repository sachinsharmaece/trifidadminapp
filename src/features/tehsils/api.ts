import { z } from 'zod';
import { apiClient } from '@/services/api/client';

const tehsilSchema = z.object({
  id: z.string(),
  state: z.string(),
  district: z.string(),
  name: z.string(),
  pincodes: z.array(z.string()),
  active: z.boolean(),
});

export type Tehsil = z.infer<typeof tehsilSchema>;

const listSchema = z.object({
  tehsils: z.array(tehsilSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const oneSchema = z.object({ tehsil: tehsilSchema });

export interface TehsilListParams {
  q: string;
  page: number;
  pageSize: number;
}

export interface TehsilInput {
  state: string;
  district: string;
  name: string;
  pincodes: string[];
}

/** `q` can be a 6-digit pincode or part of the state, district or tehsil name. */
export async function listTehsils(params: TehsilListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/tehsils', { params, signal });
  return listSchema.parse(data);
}

export async function createTehsil(input: TehsilInput): Promise<Tehsil> {
  const { data } = await apiClient.post<unknown>('/tehsils', input);
  return oneSchema.parse(data).tehsil;
}

export async function updateTehsil(
  id: string,
  changes: Partial<TehsilInput> & { active?: boolean },
): Promise<Tehsil> {
  const { data } = await apiClient.patch<unknown>(`/tehsils/${id}`, changes);
  return oneSchema.parse(data).tehsil;
}
