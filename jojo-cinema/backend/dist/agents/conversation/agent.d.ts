import type { Agent, AgentContext } from '../../agent-runtime/agent';
import type { AgentRunInput, AgentResult } from '../../agent-runtime/schemas';
import { type StructuredModel } from './modelAdapter';
export declare class ConversationIntentAgent implements Agent {
    private readonly model;
    readonly id = "conversation-intent";
    readonly name = "Conversation and Intent Agent";
    constructor(model?: StructuredModel);
    invoke(input: AgentRunInput, context: AgentContext): Promise<AgentResult>;
}
export declare function validateInterpretation(value: unknown): {
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
};
//# sourceMappingURL=agent.d.ts.map