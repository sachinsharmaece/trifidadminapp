/**
 * API_CONTRACT.md §1/§10 error envelope, copied from trifid-serverapp
 * (src/shared/errors.ts) per §11.2 — each frontend keeps its own copy rather
 * than sharing a package, so a contract change is a reviewable diff in both
 * places instead of a silent drift.
 */
export type ErrorCode =
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'LOCKED_OUT'
  | 'NEW_DEVICE'
  | 'SESSION_REPLACED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'ACCOUNT_BLACKLISTED'
  | 'PERMISSION_DENIED'
  | 'NOT_VISIBLE'
  | 'NOT_FOUND'
  | 'REAUTH_REQUIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'; // client-only: fetch itself failed, no response came back

export class ApiError extends Error {
  code: ErrorCode;
  field?: string;
  retryable: boolean;
  correlationId?: string;

  constructor(options: {
    code: ErrorCode;
    message: string;
    field?: string;
    retryable?: boolean;
    correlationId?: string;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.field = options.field;
    this.retryable = options.retryable ?? false;
    this.correlationId = options.correlationId;
  }
}
