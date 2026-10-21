import { z } from 'zod';
export declare const movieQuerySchema: z.ZodObject<{
    city: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    genre: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["NOW_SHOWING", "UPCOMING", "ENDED"]>>;
    page: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "NOW_SHOWING" | "UPCOMING" | "ENDED" | undefined;
    search?: string | undefined;
    city?: string | undefined;
    language?: string | undefined;
    genre?: string | undefined;
}, {
    status?: "NOW_SHOWING" | "UPCOMING" | "ENDED" | undefined;
    search?: string | undefined;
    city?: string | undefined;
    language?: string | undefined;
    genre?: string | undefined;
    page?: string | undefined;
    limit?: string | undefined;
}>;
export declare const movieIdSchema: z.ZodObject<{
    movieId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    movieId: string;
}, {
    movieId: string;
}>;
export declare const showQuerySchema: z.ZodObject<{
    movieId: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    theatreId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    city?: string | undefined;
    movieId?: string | undefined;
    theatreId?: string | undefined;
}, {
    date?: string | undefined;
    city?: string | undefined;
    movieId?: string | undefined;
    theatreId?: string | undefined;
}>;
export declare const showIdSchema: z.ZodObject<{
    showId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    showId: string;
}, {
    showId: string;
}>;
export declare const seatLockSchema: z.ZodObject<{
    showId: z.ZodString;
    seatIds: z.ZodArray<z.ZodString, "many">;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    showId: string;
    seatIds: string[];
    sessionId: string;
}, {
    showId: string;
    seatIds: string[];
    sessionId: string;
}>;
export declare const releaseLockSchema: z.ZodObject<{
    lockId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lockId: string;
}, {
    lockId: string;
}>;
export declare const releaseLockBodySchema: z.ZodObject<{
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
}, {
    sessionId: string;
}>;
export declare const createBookingSchema: z.ZodObject<{
    showId: z.ZodString;
    lockId: z.ZodString;
    sessionId: z.ZodString;
    seatIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    showId: string;
    seatIds: string[];
    sessionId: string;
    lockId: string;
}, {
    showId: string;
    seatIds: string[];
    sessionId: string;
    lockId: string;
}>;
export declare const bookingIdSchema: z.ZodObject<{
    bookingId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    bookingId: string;
}, {
    bookingId: string;
}>;
export declare const checkoutSchema: z.ZodObject<{
    bookingId: z.ZodString;
    sessionId: z.ZodString;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    bookingId: string;
    idempotencyKey: string;
}, {
    sessionId: string;
    bookingId: string;
    idempotencyKey: string;
}>;
export declare const paymentIdSchema: z.ZodObject<{
    paymentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    paymentId: string;
}, {
    paymentId: string;
}>;
export declare const simulatePaymentSchema: z.ZodObject<{
    outcome: z.ZodEnum<["success", "failure"]>;
}, "strip", z.ZodTypeAny, {
    outcome: "success" | "failure";
}, {
    outcome: "success" | "failure";
}>;
export declare const sessionQuerySchema: z.ZodObject<{
    sessionId: z.ZodString;
    page: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sessionId: string;
}, {
    sessionId: string;
    page?: string | undefined;
    limit?: string | undefined;
}>;
export declare const ticketRefSchema: z.ZodObject<{
    ticketReference: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ticketReference: string;
}, {
    ticketReference: string;
}>;
//# sourceMappingURL=schemas.d.ts.map