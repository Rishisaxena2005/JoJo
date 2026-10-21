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
export declare function success<T>(data: T): ApiSuccess<T>;
export declare function failure(code: string, message: string, details?: Record<string, unknown>): ApiError;
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONFLICT: "CONFLICT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly SEAT_UNAVAILABLE: "SEAT_UNAVAILABLE";
    readonly LOCK_EXPIRED: "LOCK_EXPIRED";
    readonly LOCK_NOT_FOUND: "LOCK_NOT_FOUND";
    readonly LOCK_UNAUTHORIZED: "LOCK_UNAUTHORIZED";
    readonly SEAT_LIMIT_EXCEEDED: "SEAT_LIMIT_EXCEEDED";
    readonly BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND";
    readonly BOOKING_EXPIRED: "BOOKING_EXPIRED";
    readonly BOOKING_NOT_CONFIRMED: "BOOKING_NOT_CONFIRMED";
    readonly BOOKING_ALREADY_CONFIRMED: "BOOKING_ALREADY_CONFIRMED";
    readonly BOOKING_INVALID_STATE: "BOOKING_INVALID_STATE";
    readonly LOCK_MISMATCH: "LOCK_MISMATCH";
    readonly PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND";
    readonly PAYMENT_ALREADY_PROCESSED: "PAYMENT_ALREADY_PROCESSED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly DEMO_MODE_ONLY: "DEMO_MODE_ONLY";
    readonly DUPLICATE_IDEMPOTENCY: "DUPLICATE_IDEMPOTENCY";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
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
//# sourceMappingURL=api.d.ts.map