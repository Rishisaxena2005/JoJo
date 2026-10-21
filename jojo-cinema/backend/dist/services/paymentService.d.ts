interface CheckoutInput {
    bookingId: string;
    sessionId: string;
    idempotencyKey: string;
}
export declare function checkout(input: CheckoutInput): Promise<{
    status: import(".prisma/client").$Enums.PaymentStatus;
    bookingId: string;
    idempotencyKey: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    currency: string;
    provider: string;
    providerPaymentId: string | null;
    amount: import("@prisma/client/runtime/library").Decimal;
    providerEventId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function getPaymentStatus(paymentId: string): Promise<{
    booking: {
        status: import(".prisma/client").$Enums.BookingStatus;
        sessionId: string;
        bookingReference: string;
    };
} & {
    status: import(".prisma/client").$Enums.PaymentStatus;
    bookingId: string;
    idempotencyKey: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    currency: string;
    provider: string;
    providerPaymentId: string | null;
    amount: import("@prisma/client/runtime/library").Decimal;
    providerEventId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function simulatePayment(paymentId: string, outcome: 'success' | 'failure'): Promise<{
    status: import(".prisma/client").$Enums.PaymentStatus;
    bookingId: string;
    idempotencyKey: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    currency: string;
    provider: string;
    providerPaymentId: string | null;
    amount: import("@prisma/client/runtime/library").Decimal;
    providerEventId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
} | null>;
export declare function processWebhook(body: Record<string, unknown>, signature?: string): Promise<{
    status: import(".prisma/client").$Enums.PaymentStatus;
    bookingId: string;
    idempotencyKey: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    currency: string;
    provider: string;
    providerPaymentId: string | null;
    amount: import("@prisma/client/runtime/library").Decimal;
    providerEventId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
} | {
    deduplicated: boolean;
} | null>;
export {};
//# sourceMappingURL=paymentService.d.ts.map