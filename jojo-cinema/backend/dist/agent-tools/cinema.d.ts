import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';
import { getMovies } from '../services/movieService';
import { getShows } from '../services/showService';
declare const movieSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    genre: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query?: string | undefined;
    city?: string | undefined;
    language?: string | undefined;
    genre?: string | undefined;
}, {
    query?: string | undefined;
    city?: string | undefined;
    language?: string | undefined;
    genre?: string | undefined;
}>;
declare const showSchema: z.ZodObject<{
    movieTitle: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    movieTitle: string;
    date?: string | undefined;
    city?: string | undefined;
}, {
    movieTitle: string;
    date?: string | undefined;
    city?: string | undefined;
}>;
export declare const movieSearchTool: AgentTool<typeof movieSchema, Awaited<ReturnType<typeof getMovies>>['items']>;
export declare const showtimeSearchTool: AgentTool<typeof showSchema, Awaited<ReturnType<typeof getShows>>>;
export {};
//# sourceMappingURL=cinema.d.ts.map