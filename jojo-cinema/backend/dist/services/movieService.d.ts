import { MovieStatus } from '@prisma/client';
interface MovieFilters {
    city?: string;
    search?: string;
    language?: string;
    genre?: string;
    status?: MovieStatus;
    page: number;
    limit: number;
}
export declare function getMovies(filters: MovieFilters): Promise<{
    items: {
        status: import(".prisma/client").$Enums.MovieStatus;
        language: string;
        id: string;
        _count: {
            shows: number;
        };
        title: string;
        synopsis: string;
        genres: string[];
        durationMinutes: number;
        certification: string;
        posterUrl: string | null;
        backdropUrl: string | null;
        releaseDate: Date;
        director: string | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getMovieById(movieId: string): Promise<{
    _count: {
        shows: number;
    };
} & {
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
}>;
export {};
//# sourceMappingURL=movieService.d.ts.map