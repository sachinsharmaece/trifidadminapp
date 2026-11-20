import { z } from 'zod';
import { apiClient } from '@/services/api/client';

const manufacturerSchema = z.object({ id: z.string(), name: z.string(), active: z.boolean() });

export type Manufacturer = z.infer<typeof manufacturerSchema>;

const listSchema = z.object({ manufacturers: z.array(manufacturerSchema) });
const oneSchema = z.object({ manufacturer: manufacturerSchema });

export async function listManufacturers(signal?: AbortSignal): Promise<Manufacturer[]> {
  const { data } = await apiClient.get<unknown>('/manufacturers', { signal });
  return listSchema.parse(data).manufacturers;
}

export async function createManufacturer(input: { name: string }): Promise<Manufacturer> {
  const { data } = await apiClient.post<unknown>('/manufacturers', input);
  return oneSchema.parse(data).manufacturer;
}

export async function updateManufacturer(
  id: string,
  changes: { name?: string; active?: boolean },
): Promise<Manufacturer> {
  const { data } = await apiClient.patch<unknown>(`/manufacturers/${id}`, changes);
  return oneSchema.parse(data).manufacturer;
}
