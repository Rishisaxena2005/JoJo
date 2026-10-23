export type AgentEventType = 'channel.received' | 'channel.replied' | 'channel.failed' | 'workflow.started' | 'workflow.completed' | 'workflow.failed' | 'run.started' | 'agent.started' | 'agent.decided' | 'agent.completed' | 'agent.failed' | 'run.completed' | 'run.failed' | 'handoff.sent' | 'handoff.returned' | 'tool.started' | 'tool.completed' | 'tool.failed';
export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed';
export interface AgentEvent {
    runId: string;
    conversationId: string;
    agentId: string;
    agentName: string;
    from?: string;
    to?: string;
    eventType: AgentEventType;
    timestamp: string;
    status: AgentStatus;
    summary?: string;
    toolName?: string;
    sanitizedArguments?: Record<string, string | number | boolean>;
    toolResultSummary?: string;
    replyPreview?: string;
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
export declare function withAgentTraceContext<T>(context: {
    runId: string;
    conversationId: string;
}, callback: () => Promise<T>): Promise<T>;
export declare function getAgentTraceContext(): {
    runId: string;
    conversationId: string;
} | undefined;
export declare function getRecentAgentEvents(limit?: number): AgentEvent[];
export declare function subscribeToAgentEvents(subscriber: (event: AgentEvent) => void): () => void;
export declare function createAgentEvent(event: Omit<AgentEvent, 'timestamp'>): AgentEvent;
export declare function newRunId(): string;
//# sourceMappingURL=events.d.ts.map