import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';
declare const searchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query?: string | undefined;
    city?: string | undefined;
}, {
    query?: string | undefined;
    city?: string | undefined;
}>;
declare const showSchema: z.ZodObject<{
    movieTitle: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    movieTitle: string;
    city?: string | undefined;
}, {
    movieTitle: string;
    city?: string | undefined;
}>;
declare const mockMovies: {
    id: string;
    title: string;
    genres: string[];
    language: string;
    certification: string;
    city: string;
}[];
export declare const mockMovieSearchTool: AgentTool<typeof searchSchema, typeof mockMovies>;
export declare const mockShowtimeSearchTool: AgentTool<typeof showSchema, Array<{
    movieTitle: string;
    theatre: string;
    startTime: string;
    availableSeats: number;
    priceInr: number;
}>>;
export {};
//# sourceMappingURL=mockCinema.d.ts.map