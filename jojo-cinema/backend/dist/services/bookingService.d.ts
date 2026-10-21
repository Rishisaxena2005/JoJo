interface CreateBookingInput {
    showId: string;
    lockId: string;
    sessionId: string;
    seatIds: string[];
}
export declare function createBooking(input: CreateBookingInput): Promise<{
    show: {
        movie: {
            language: string;
            id: string;
            title: string;
            posterUrl: string | null;
        };
        screen: {
            theatre: {
                city: {
                    id: string;
                    name: string;
                    state: string;
                    country: string;
                    createdAt: Date;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                cityId: string;
                address: string;
                timezone: string;
            };
        } & {
            theatreId: string;
            id: string;
            name: string;
            seatLayout: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        status: import(".prisma/client").$Enums.ShowStatus;
        movieId: string;
        id: string;
        createdAt: Date;
        screenId: string;
        startTime: Date;
        endTime: Date;
        format: string;
    };
    bookingSeats: ({
        showSeat: {
            seat: {
                seatLabel: string;
                rowLabel: string;
                seatType: import(".prisma/client").$Enums.SeatType;
            };
        } & {
            status: import(".prisma/client").$Enums.ShowSeatStatus;
            showId: string;
            id: string;
            seatId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        bookingId: string;
        id: string;
        showSeatId: string;
        priceAtBooking: import("@prisma/client/runtime/library").Decimal;
    })[];
} & {
    status: import(".prisma/client").$Enums.BookingStatus;
    showId: string;
    sessionId: string;
    id: string;
    createdAt: Date;
    expiresAt: Date;
    bookingReference: string;
    totalAmount: import("@prisma/client/runtime/library").Decimal;
    currency: string;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
}>;
export declare function getBookingById(bookingId: string, sessionId?: string): Promise<{
    show: {
        movie: {
            status: import(".prisma/client").$Enums.MovieStatus;
            language: string;
            id: string;
            createdAt: Date;
            title: string;
            synopsis: string;
            genres: string[];
            durationMinutes: number;
            certification: string;
            posterUrl: string | null;
            backdropUrl: string | null;
            releaseDate: Date;
            director: string | null;
            cast: string[];
            updatedAt: Date;
        };
        screen: {
            theatre: {
                city: {
                    id: string;
                    name: string;
                    state: string;
                    country: string;
                    createdAt: Date;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                cityId: string;
                address: string;
                timezone: string;
            };
        } & {
            theatreId: string;
            id: string;
            name: string;
            seatLayout: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        status: import(".prisma/client").$Enums.ShowStatus;
        movieId: string;
        id: string;
        createdAt: Date;
        screenId: string;
        startTime: Date;
        endTime: Date;
        format: string;
    };
    ticket: {
        bookingId: string;
        ticketReference: string;
        id: string;
        qrToken: string;
        issuedAt: Date;
        verifiedAt: Date | null;
    } | null;
    bookingSeats: ({
        showSeat: {
            seat: {
                seatLabel: string;
                rowLabel: string;
                seatType: import(".prisma/client").$Enums.SeatType;
            };
        } & {
            status: import(".prisma/client").$Enums.ShowSeatStatus;
            showId: string;
            id: string;
            seatId: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        bookingId: string;
        id: string;
        showSeatId: string;
        priceAtBooking: import("@prisma/client/runtime/library").Decimal;
    })[];
    payments: {
        status: import(".prisma/client").$Enums.PaymentStatus;
        id: string;
        createdAt: Date;
        provider: string;
        amount: import("@prisma/client/runtime/library").Decimal;
    }[];
} & {
    status: import(".prisma/client").$Enums.BookingStatus;
    showId: string;
    sessionId: string;
    id: string;
    createdAt: Date;
    expiresAt: Date;
    bookingReference: string;
    totalAmount: import("@prisma/client/runtime/library").Decimal;
    currency: string;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
}>;
export declare function getBookingsBySession(sessionId: string, page: number, limit: number): Promise<{
    items: ({
        show: {
            movie: {
                language: string;
                id: string;
                title: string;
                posterUrl: string | null;
            };
            screen: {
                theatre: {
                    city: {
                        id: string;
                        name: string;
                        state: string;
                        country: string;
                        createdAt: Date;
                    };
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    cityId: string;
                    address: string;
                    timezone: string;
                };
            } & {
                theatreId: string;
                id: string;
                name: string;
                seatLayout: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            status: import(".prisma/client").$Enums.ShowStatus;
            movieId: string;
            id: string;
            createdAt: Date;
            screenId: string;
            startTime: Date;
            endTime: Date;
            format: string;
        };
        ticket: {
            ticketReference: string;
        } | null;
        bookingSeats: ({
            showSeat: {
                seat: {
                    seatLabel: string;
                };
            } & {
                status: import(".prisma/client").$Enums.ShowSeatStatus;
                showId: string;
                id: string;
                seatId: string;
                price: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            bookingId: string;
            id: string;
            showSeatId: string;
            priceAtBooking: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        showId: string;
        sessionId: string;
        id: string;
        createdAt: Date;
        expiresAt: Date;
        bookingReference: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getBookingTicket(bookingId: string, sessionId?: string): Promise<{
    bookingId: string;
    ticketReference: string;
    id: string;
    qrToken: string;
    issuedAt: Date;
    verifiedAt: Date | null;
}>;
export declare function expireStaleBookings(): Promise<number>;
export {};
//# sourceMappingURL=bookingService.d.ts.map