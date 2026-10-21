interface ShowFilters {
    movieId?: string;
    city?: string;
    date?: string;
    theatreId?: string;
}
export declare function getShows(filters: ShowFilters): Promise<{
    id: string;
    movieId: string;
    movie: {
        language: string;
        id: string;
        title: string;
        genres: string[];
        durationMinutes: number;
        certification: string;
        posterUrl: string | null;
    };
    screen: {
        id: string;
        name: string;
        theatre: {
            id: string;
            name: string;
            address: string;
            city: {
                id: string;
                name: string;
                state: string;
                country: string;
                createdAt: Date;
            };
            timezone: string;
        };
    };
    startTime: Date;
    endTime: Date;
    format: string;
    status: import(".prisma/client").$Enums.ShowStatus;
    availability: {
        available: number;
        total: number;
        soldOut: boolean;
    };
    priceRange: {
        min: number;
        max: number;
    };
}[]>;
export declare function getShowById(showId: string): Promise<{
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
    showSeats: ({
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
    })[];
} & {
    status: import(".prisma/client").$Enums.ShowStatus;
    movieId: string;
    id: string;
    createdAt: Date;
    screenId: string;
    startTime: Date;
    endTime: Date;
    format: string;
}>;
export declare function getShowSeats(showId: string): Promise<{
    showId: string;
    rows: {
        rowLabel: string;
        seats: {
            showSeatId: string;
            seatId: string;
            seatLabel: string;
            seatType: import(".prisma/client").$Enums.SeatType;
            price: number;
            status: import(".prisma/client").$Enums.ShowSeatStatus;
        }[];
    }[];
}>;
export {};
//# sourceMappingURL=showService.d.ts.map