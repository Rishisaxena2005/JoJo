import type { Agent, AgentContext } from '../../agent-runtime/agent';
import type { AgentRunInput, AgentResult } from '../../agent-runtime/schemas';
import { type StructuredModel } from './modelAdapter';
type City = {
    name: string;
    state?: string;
};
type Theatre = {
    name: string;
    address: string;
    city: City;
};
type Movie = {
    id?: string;
    title: string;
    language?: string;
    genres?: string[];
    synopsis?: string;
    director?: string | null;
    durationMinutes?: number;
    certification?: string;
};
type CinemaData = {
    cities(): Promise<City[]>;
    theatres(city?: string): Promise<Theatre[]>;
    movies(city?: string, context?: AgentContext): Promise<Movie[]>;
    shows(movieTitle: string, city?: string, date?: string, context?: AgentContext): Promise<Array<Record<string, any>>>;
};
export declare class ConversationIntentAgent implements Agent {
    private readonly model;
    private readonly data;
    readonly id = "conversation-intent";
    readonly name = "Conversation and Intent Agent";
    constructor(model?: StructuredModel, data?: CinemaData);
    invoke(input: AgentRunInput, context: AgentContext): Promise<AgentResult>;
}
export declare function validateInterpretation(value: unknown): {
    rationale: string;
    intent: "booking" | "showtime_search" | "train_search" | "movie_discovery" | "seat_selection" | "booking_support" | "general_cinema_help" | "out_of_domain" | "unclear";
    selectedTool: "movie_search" | "showtime_search" | "train_search" | null;
    needsClarification: boolean;
    constraints: {
        date: string | null;
        city: string | null;
        language: string | null;
        genres: string[];
        certification: string | null;
        timePreference: string | null;
        durationPreference: string | null;
    };
    clarificationQuestion: string | null;
    toolArguments: {
        date?: string | null | undefined;
        query?: string | null | undefined;
        city?: string | null | undefined;
        language?: string | null | undefined;
        genre?: string | null | undefined;
        movieTitle?: string | null | undefined;
        fromStation?: string | null | undefined;
        toStation?: string | null | undefined;
        passengers?: number | null | undefined;
    } | null;
    responseDraft: string;
};
export {};
//# sourceMappingURL=agent.d.ts.map