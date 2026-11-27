import axios, { isAxiosError, isCancel } from 'axios';
import { env } from '@/lib/env';
import { createIdempotencyKey } from '@/utils/id';
import { ApiError } from './ApiError';
import { apiErrorEnvelopeSchema } from './errorEnvelope';

/**
 * The single Axios instance for the whole app. Rules for using it:
 *  - Call it only from services/ or features/<name>/api.ts, never from a component.
 *  - Use `get<unknown>(...)` and parse the result with a Zod schema.
 *  - This client never retries by itself. TanStack Query decides about retries (see services/query).
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // the session lives in a cookie
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

// ---------------------------------------------------------------------------
// Request: every write gets a fresh Idempotency-Key (unless the caller set one).
// ---------------------------------------------------------------------------
const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();

  if (WRITE_METHODS.has(method) && !config.headers.has('Idempotency-Key')) {
    config.headers.set('Idempotency-Key', createIdempotencyKey());
  }

  return config;
});

// ---------------------------------------------------------------------------
// Response: turn every failure into an ApiError.
// ---------------------------------------------------------------------------

function messageForStatus(status: number): string {
  return status >= 500
    ? 'The server had a problem. Please try again.'
    : `The request failed (${status}).`;
}

/** Reads the error body: the server's { error: { code, message, ... } } envelope, or a plain { error: "text" }. */
function apiErrorFromResponse(status: number, data: unknown): ApiError {
  const envelope = apiErrorEnvelopeSchema.safeParse(data);
  if (envelope.success) {
    const { code, message, details, requestId } = envelope.data.error;
    return new ApiError({ status, code, message, details, requestId });
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof data.error === 'string'
  ) {
    const details = 'details' in data ? data.details : undefined;
    return new ApiError({ status, code: `HTTP_${status}`, message: data.error, details });
  }

  return new ApiError({ status, code: `HTTP_${status}`, message: messageForStatus(status) });
}

/** A download asks for a Blob, so even the server's error message arrives as one: read it back as JSON. */
async function readErrorBody(data: unknown): Promise<unknown> {
  if (!(data instanceof Blob)) return data;
  try {
    return JSON.parse(await data.text()) as unknown;
  } catch {
    return undefined;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // A request cancelled on purpose (e.g. by TanStack Query) is not a failure: pass it through.
    if (isCancel(error)) {
      return Promise.reject(error);
    }

    if (!isAxiosError(error)) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      return Promise.reject(new ApiError({ status: 0, code: 'UNKNOWN_ERROR', message }));
    }

    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return Promise.reject(
        new ApiError({
          status: 0,
          code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: timedOut
            ? 'The server took too long to answer. Please try again.'
            : 'Cannot reach the server. Check your connection and try again.',
        }),
      );
    }

    return Promise.reject(
      apiErrorFromResponse(error.response.status, await readErrorBody(error.response.data)),
    );
  },
);
