import { env } from '../lib/env';
import { ApiError, type ErrorCode } from './errors';

interface Envelope<T> {
  data: T;
  meta: { correlationId: string; nextCursor?: string };
}

interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message_en: string;
    message_hi?: string;
    field?: string;
    retryable?: boolean;
    correlationId?: string;
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  // CH §24.2 — presented again on the money-moving call itself (requireReauth.ts).
  reauthToken?: string;
}

/**
 * One low-level fetch wrapper. It only knows how to talk the API_CONTRACT.md
 * §1 envelope — it does not know about sessions, refresh, or redirects.
 * `auth/AuthContext.tsx` is the layer that reacts to a REAUTH_REQUIRED by
 * attempting a silent refresh.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include', // sends the httpOnly refresh-token cookie
      headers: {
        'Content-Type': 'application/json',
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        ...(options.reauthToken ? { 'X-Reauth-Token': options.reauthToken } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      retryable: true,
    });
  }

  const json = (await response.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;

  if (!response.ok || !json || 'error' in json) {
    const error = json && 'error' in json ? json.error : null;
    throw new ApiError({
      code: error?.code ?? 'INTERNAL_ERROR',
      message: error?.message_en ?? 'Something went wrong. Please try again.',
      field: error?.field,
      retryable: error?.retryable ?? response.status >= 500,
      correlationId: error?.correlationId,
    });
  }

  return json.data;
}
