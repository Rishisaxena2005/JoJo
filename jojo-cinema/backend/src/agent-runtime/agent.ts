import type { AgentRunInput, AgentResult } from './schemas';

export interface AgentContext {
  runId: string;
  conversationId: string;
  signal: AbortSignal;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  invoke(input: AgentRunInput, context: AgentContext): Promise<AgentResult>;
}
