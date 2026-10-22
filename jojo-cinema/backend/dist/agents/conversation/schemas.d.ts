import { z } from 'zod';
export declare const intentSchema: z.ZodEnum<["movie_discovery", "showtime_search", "seat_selection", "booking", "booking_support", "general_cinema_help", "out_of_domain", "unclear"]>;
export type ConversationIntent = z.infer<typeof intentSchema>;
export declare const conversationInterpretationSchema: z.ZodObject<{
    intent: z.ZodEnum<["movie_discovery", "showtime_search", "seat_selection", "booking", "booking_support", "general_cinema_help", "out_of_domain", "unclear"]>;
    constraints: z.ZodObject<{
        city: z.ZodNullable<z.ZodString>;
        date: z.ZodNullable<z.ZodString>;
        timePreference: z.ZodNullable<z.ZodString>;
        language: z.ZodNullable<z.ZodString>;
        genres: z.ZodArray<z.ZodString, "many">;
        certification: z.ZodNullable<z.ZodString>;
        durationPreference: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        date: string | null;
        city: string | null;
        language: string | null;
        genres: string[];
        certification: string | null;
        timePreference: string | null;
        durationPreference: string | null;
    }, {
        date: string | null;
        city: string | null;
        language: string | null;
        genres: string[];
        certification: string | null;
        timePreference: string | null;
        durationPreference: string | null;
    }>;
    needsClarification: z.ZodBoolean;
    clarificationQuestion: z.ZodNullable<z.ZodString>;
    selectedTool: z.ZodNullable<z.ZodEnum<["movie_search", "showtime_search"]>>;
    toolArguments: z.ZodNullable<z.ZodObject<{
        query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        movieTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        language: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        genre: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        date?: string | null | undefined;
        query?: string | null | undefined;
        city?: string | null | undefined;
        language?: string | null | undefined;
        genre?: string | null | undefined;
        movieTitle?: string | null | undefined;
    }, {
        date?: string | null | undefined;
        query?: string | null | undefined;
        city?: string | null | undefined;
        language?: string | null | undefined;
        genre?: string | null | undefined;
        movieTitle?: string | null | undefined;
    }>>;
    responseDraft: z.ZodString;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rationale: string;
    intent: "booking" | "showtime_search" | "movie_discovery" | "seat_selection" | "booking_support" | "general_cinema_help" | "out_of_domain" | "unclear";
    constraints: {
        date: string | null;
        city: string | null;
        language: string | null;
        genres: string[];
        certification: string | null;
        timePreference: string | null;
        durationPreference: string | null;
    };
    needsClarification: boolean;
    clarificationQuestion: string | null;
    selectedTool: "movie_search" | "showtime_search" | null;
    toolArguments: {
        date?: string | null | undefined;
        query?: string | null | undefined;
        city?: string | null | undefined;
        language?: string | null | undefined;
        genre?: string | null | undefined;
        movieTitle?: string | null | undefined;
    } | null;
    responseDraft: string;
}, {
    rationale: string;
    intent: "booking" | "showtime_search" | "movie_discovery" | "seat_selection" | "booking_support" | "general_cinema_help" | "out_of_domain" | "unclear";
    constraints: {
        date: string | null;
        city: string | null;
        language: string | null;
        genres: string[];
        certification: string | null;
        timePreference: string | null;
        durationPreference: string | null;
    };
    needsClarification: boolean;
    clarificationQuestion: string | null;
    selectedTool: "movie_search" | "showtime_search" | null;
    toolArguments: {
        date?: string | null | undefined;
        query?: string | null | undefined;
        city?: string | null | undefined;
        language?: string | null | undefined;
        genre?: string | null | undefined;
        movieTitle?: string | null | undefined;
    } | null;
    responseDraft: string;
}>;
export declare const groundedResponseSchema: z.ZodObject<{
    response: z.ZodString;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
    rationale: string;
}, {
    response: string;
    rationale: string;
}>;
export type ConversationInterpretation = z.infer<typeof conversationInterpretationSchema>;
//# sourceMappingURL=schemas.d.ts.map