export interface ApiErrorInit {
  /** HTTP status, or 0 when the request never got an answer (offline, timeout, CORS...). */
  status: number;
  /** Machine-readable code, e.g. UNAUTHENTICATED. Use this in `if` checks, never the message. */
  code: string;
  /** Text that is safe to show to the user. */
  message: string;
  details?: unknown;
  requestId?: string;
}

/** The one error type the web app throws for any failed API call. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
  }

  /** 4xx: the request itself was wrong or not allowed, so sending it again will not help. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}
