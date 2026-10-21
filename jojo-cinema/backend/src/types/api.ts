// ─── API Response Envelope ───────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Helper Constructors ─────────────────────────────────────────────────────

export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data, error: null };
}

export function failure(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return { success: false, data: null, error: { code, message, details } };
}

// ─── Error Codes ─────────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Generic
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',

  // Seat locking
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  LOCK_EXPIRED: 'LOCK_EXPIRED',
  LOCK_NOT_FOUND: 'LOCK_NOT_FOUND',
  LOCK_UNAUTHORIZED: 'LOCK_UNAUTHORIZED',
  SEAT_LIMIT_EXCEEDED: 'SEAT_LIMIT_EXCEEDED',

  // Booking
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  BOOKING_NOT_CONFIRMED: 'BOOKING_NOT_CONFIRMED',
  BOOKING_ALREADY_CONFIRMED: 'BOOKING_ALREADY_CONFIRMED',
  BOOKING_INVALID_STATE: 'BOOKING_INVALID_STATE',
  LOCK_MISMATCH: 'LOCK_MISMATCH',

  // Payment
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  DEMO_MODE_ONLY: 'DEMO_MODE_ONLY',
  DUPLICATE_IDEMPOTENCY: 'DUPLICATE_IDEMPOTENCY',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}
