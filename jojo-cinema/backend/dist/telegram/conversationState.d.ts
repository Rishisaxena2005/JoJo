import { z } from 'zod';
export declare const conversationStateSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodLiteral<1>>;
    stage: z.ZodDefault<z.ZodEnum<["idle", "movie_search", "awaiting_city", "awaiting_movie", "awaiting_theatre", "awaiting_showtime", "awaiting_seats", "booking", "payment", "recovering"]>>;
    activeIntent: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    entities: z.ZodDefault<z.ZodObject<{
        movie: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        city: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theatre: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        date: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        time: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        seatCount: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        bookingId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        date: string | null;
        movie: string | null;
        city: string | null;
        theatre: string | null;
        bookingId: string | null;
        time: string | null;
        seatCount: number | null;
    }, {
        date?: string | null | undefined;
        movie?: string | null | undefined;
        city?: string | null | undefined;
        theatre?: string | null | undefined;
        bookingId?: string | null | undefined;
        time?: string | null | undefined;
        seatCount?: number | null | undefined;
    }>>;
    pendingQuestion: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        type: z.ZodString;
        prompt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        prompt: string;
    }, {
        type: string;
        prompt: string;
    }>>>;
    presentedOptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["movie", "city", "theatre", "showtime", "seat"]>;
    }, "strip", z.ZodTypeAny, {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }, {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }>, "many">>;
    lastTool: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    updatedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    updatedAt: string | null;
    schemaVersion: 1;
    stage: "booking" | "payment" | "idle" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
    activeIntent: string | null;
    entities: {
        date: string | null;
        movie: string | null;
        city: string | null;
        theatre: string | null;
        bookingId: string | null;
        time: string | null;
        seatCount: number | null;
    };
    pendingQuestion: {
        type: string;
        prompt: string;
    } | null;
    presentedOptions: {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }[];
    lastTool: string | null;
}, {
    updatedAt?: string | null | undefined;
    schemaVersion?: 1 | undefined;
    stage?: "booking" | "payment" | "idle" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering" | undefined;
    activeIntent?: string | null | undefined;
    entities?: {
        date?: string | null | undefined;
        movie?: string | null | undefined;
        city?: string | null | undefined;
        theatre?: string | null | undefined;
        bookingId?: string | null | undefined;
        time?: string | null | undefined;
        seatCount?: number | null | undefined;
    } | undefined;
    pendingQuestion?: {
        type: string;
        prompt: string;
    } | null | undefined;
    presentedOptions?: {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }[] | undefined;
    lastTool?: string | null | undefined;
}>;
export type ConversationState = z.infer<typeof conversationStateSchema>;
export type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};
export declare function loadTelegramConversation(chatId: string, userId: string, updateId: number): Promise<{
    duplicate: boolean;
    history: ConversationMessage[];
    state: {
        updatedAt: string | null;
        schemaVersion: 1;
        stage: "booking" | "payment" | "idle" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
        activeIntent: string | null;
        entities: {
            date: string | null;
            movie: string | null;
            city: string | null;
            theatre: string | null;
            bookingId: string | null;
            time: string | null;
            seatCount: number | null;
        };
        pendingQuestion: {
            type: string;
            prompt: string;
        } | null;
        presentedOptions: {
            type: "movie" | "city" | "theatre" | "seat" | "showtime";
            id: string;
            label: string;
        }[];
        lastTool: string | null;
    };
    version?: undefined;
} | {
    duplicate: boolean;
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
    state: {
        updatedAt: string | null;
        schemaVersion: 1;
        stage: "booking" | "payment" | "idle" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
        activeIntent: string | null;
        entities: {
            date: string | null;
            movie: string | null;
            city: string | null;
            theatre: string | null;
            bookingId: string | null;
            time: string | null;
            seatCount: number | null;
        };
        pendingQuestion: {
            type: string;
            prompt: string;
        } | null;
        presentedOptions: {
            type: "movie" | "city" | "theatre" | "seat" | "showtime";
            id: string;
            label: string;
        }[];
        lastTool: string | null;
    };
    version: number;
}>;
export declare function saveTelegramConversation(input: {
    chatId: string;
    userId: string;
    updateId: number;
    history: ConversationMessage[];
    state: ConversationState;
}): Promise<void>;
export declare function stateFromTurn(state: ConversationState, userText: string, reply: string): ConversationState;
//# sourceMappingURL=conversationState.d.ts.map