import { apiClient } from '@/services/api/client';
import { ApiError } from '@/services/api/ApiError';

/**
 * Small helpers for the screens copied from the reference admin (reference-copy branch). The reference pages read
 * with fetch() and write with apiFetch() + readApiError() ({ field, message }); these do the same against our API.
 */
export async function refGet<T = Record<string, unknown>>(
  path: string,
  params?: object,
): Promise<T> {
  const { data } = await apiClient.get<T>(path, params ? { params } : {});
  return data;
}

export type RefResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; field: string | null; message: string };

/** A write. On failure: the first field the server named (if any) and a message to show under it. */
export async function refSend<T = Record<string, unknown>>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<RefResult<T>> {
  try {
    const { data } = await apiClient.request<T>({ method, url: path, data: body });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      const details = Array.isArray(error.details)
        ? (error.details as { path?: unknown; message?: unknown }[])
        : [];
      const first = details.find((item) => typeof item.path === 'string' && item.path !== '');
      return {
        ok: false,
        status: error.status,
        code: error.code,
        field: first ? (String(first.path).split('.')[0] ?? null) : null,
        message: first && typeof first.message === 'string' ? first.message : error.message,
      };
    }
    return {
      ok: false,
      status: 0,
      code: 'NETWORK',
      field: null,
      message: 'Something went wrong. Try again.',
    };
  }
}
