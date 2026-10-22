import { type BaseMessage } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}
export interface StructuredModel {
    generate<T>(schema: z.ZodType<T>, messages: BaseMessage[], signal: AbortSignal): Promise<{
        value: T;
        usage: TokenUsage;
    }>;
}
export declare class OpenAIStructuredModel implements StructuredModel {
    private readonly model;
    constructor(model?: ChatOpenAI);
    generate<T>(schema: z.ZodType<T>, messages: BaseMessage[], signal: AbortSignal): Promise<{
        value: T;
        usage: {
            inputTokens: number;
            outputTokens: number;
        };
    }>;
}
export declare function makeConversationMessages(history: Array<{
    role: 'user' | 'assistant';
    content: string;
}>, current: string): BaseMessage[];
//# sourceMappingURL=modelAdapter.d.ts.map