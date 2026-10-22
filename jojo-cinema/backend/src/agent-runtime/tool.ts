import { z } from 'zod';
import { createAgentEvent } from './events';

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

export async function invokeTool<TArgs extends z.ZodTypeAny, TResult>(
  tool: AgentTool<TArgs, TResult>, rawArgs: unknown, context: ToolContext,
): Promise<TResult> {
  const args = tool.schema.parse(rawArgs);
  const startedAt = Date.now();
  createAgentEvent({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.started', status: 'running', toolName: tool.name, sanitizedArguments: tool.sanitizeArguments(args) });
  try {
    const result = await tool.execute(args, context);
    createAgentEvent({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.completed', status: 'completed', toolName: tool.name, toolResultSummary: tool.summarizeResult(result), durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    createAgentEvent({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.failed', status: 'failed', toolName: tool.name, durationMs: Date.now() - startedAt, errorCategory: 'tool', recoveryStatus: 'not_attempted' });
    throw error;
  }
}
