import type { Agent } from './agent';
import { type AgentResult } from './schemas';
export interface AgentRuntimeOptions {
    timeoutMs: number;
    maxCostUsd: number;
    inputCostPer1MUsd: number;
    outputCostPer1MUsd: number;
}
export interface AgentRunResult {
    runId: string;
    conversationId: string;
    result: AgentResult;
    durationMs: number;
    estimatedCostUsd: number;
}
export declare function createAgentRuntime(agent: Agent, options: AgentRuntimeOptions): {
    run(rawInput: unknown): Promise<AgentRunResult>;
    maxCostUsd: number;
};
//# sourceMappingURL=graph.d.ts.map