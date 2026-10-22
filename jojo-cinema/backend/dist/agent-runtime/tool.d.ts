import { z } from 'zod';
export interface ToolContext {
    runId: string;
    conversationId: string;
    agentId: string;
    agentName: string;
    signal: AbortSignal;
}
export interface AgentTool<TArgs extends z.ZodTypeAny, TResult> {
    name: string;
    description: string;
    schema: TArgs;
    /** Only safe, non-sensitive fields are included in logs. */
    sanitizeArguments(args: z.infer<TArgs>): Record<string, string | number | boolean>;
    summarizeResult(result: TResult): string;
    execute(args: z.infer<TArgs>, context: ToolContext): Promise<TResult>;
}
export declare function invokeTool<TArgs extends z.ZodTypeAny, TResult>(tool: AgentTool<TArgs, TResult>, rawArgs: unknown, context: ToolContext): Promise<TResult>;
//# sourceMappingURL=tool.d.ts.map