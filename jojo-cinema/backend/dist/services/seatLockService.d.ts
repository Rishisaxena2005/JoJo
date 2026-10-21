interface LockSeatsInput {
    showId: string;
    seatIds: string[];
    sessionId: string;
}
export declare function lockSeats(input: LockSeatsInput): Promise<{
    lockId: string;
    showId: string;
    seatIds: string[];
    seatLabels: string[];
    expiresAt: Date;
    status: import(".prisma/client").$Enums.SeatLockStatus;
}>;
export declare function releaseLock(lockId: string, sessionId: string): Promise<{
    lockId: string;
    status: "RELEASED" | "EXPIRED" | "CONVERTED";
    message: string;
} | {
    lockId: string;
    status: string;
    message?: undefined;
}>;
export declare function getLockById(lockId: string): Promise<{
    seats: ({
        showSeat: {
            seat: {
                id: string;
                screenId: string;
                seatLabel: string;
                rowLabel: string;
                seatType: import(".prisma/client").$Enums.SeatType;
                basePrice: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            status: import(".prisma/client").$Enums.ShowSeatStatus;
            showId: string;
            id: string;
            seatId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        showSeatId: string;
        seatLockId: string;
    })[];
} & {
    status: import(".prisma/client").$Enums.SeatLockStatus;
    showId: string;
    sessionId: string;
    id: string;
    createdAt: Date;
    expiresAt: Date;
}>;
export {};
//# sourceMappingURL=seatLockService.d.ts.map