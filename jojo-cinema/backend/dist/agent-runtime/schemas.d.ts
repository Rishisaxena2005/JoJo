import { z } from 'zod';
export declare const conversationMessageSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "assistant"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    role: "user" | "assistant";
    content: string;
}, {
    role: "user" | "assistant";
    content: string;
}>;
export declare const agentRunInputSchema: z.ZodObject<{
    message: z.ZodString;
    conversationId: z.ZodOptional<z.ZodString>;
    history: z.ZodDefault<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
    }, {
        role: "user" | "assistant";
        content: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
    conversationId?: string | undefined;
}, {
    message: string;
    conversationId?: string | undefined;
    history?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
}>;
export declare const agentResultSchema: z.ZodObject<{
    status: z.ZodEnum<["completed", "waiting", "failed"]>;
    response: z.ZodString;
    rationale: z.ZodOptional<z.ZodString>;
    toolCalls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    usage: z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inputTokens: number;
        outputTokens: number;
    }, {
        inputTokens: number;
        outputTokens: number;
    }>;
    /** Internal decision data for evaluation and routing. Do not send directly to end users. */
    decision: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Verified tool payloads used for the answer; excluded from event logs. */
    groundingEvidence: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "waiting";
    response: string;
    toolCalls: string[];
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    rationale?: string | undefined;
    decision?: Record<string, unknown> | undefined;
    groundingEvidence?: unknown[] | undefined;
}, {
    status: "completed" | "failed" | "waiting";
    response: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    rationale?: string | undefined;
    toolCalls?: string[] | undefined;
    decision?: Record<string, unknown> | undefined;
    groundingEvidence?: unknown[] | undefined;
}>;
export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
//# sourceMappingURL=schemas.d.ts.map