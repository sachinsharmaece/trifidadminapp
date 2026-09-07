import { apiFetch } from './client';
import type { TehsilDto } from './dto';

// API-026
export function getTehsils(accessToken: string): Promise<TehsilDto[]> {
  return apiFetch('/admin/tehsils', { accessToken });
}

export function createTehsil(
  accessToken: string,
  input: { name: string; district: string; state: string },
): Promise<{ tehsilId: string }> {
  return apiFetch('/admin/tehsils', { method: 'POST', body: input, accessToken });
}
