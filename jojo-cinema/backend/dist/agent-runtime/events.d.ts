export type AgentEventType = 'run.started' | 'agent.started' | 'agent.completed' | 'agent.failed' | 'run.completed' | 'run.failed' | 'tool.started' | 'tool.completed' | 'tool.failed';
export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed';
export interface AgentEvent {
    runId: string;
    conversationId: string;
    agentId: string;
    agentName: string;
    eventType: AgentEventType;
    timestamp: string;
    status: AgentStatus;
    summary?: string;
    toolName?: string;
    sanitizedArguments?: Record<string, string | number | boolean>;
    toolResultSummary?: string;
    parentRunId?: string;
    parentTaskId?: string;
    durationMs?: number;
    tokenUsage?: {
        input: number;
        output: number;
    };
    estimatedCostUsd?: number;
    errorCategory?: 'timeout' | 'configuration' | 'validation' | 'tool' | 'model' | 'unknown';
    recoveryStatus?: 'not_attempted' | 'recovered' | 'failed';
}
export declare function createAgentEvent(event: Omit<AgentEvent, 'timestamp'>): AgentEvent;
export declare function newRunId(): string;
//# sourceMappingURL=events.d.ts.map