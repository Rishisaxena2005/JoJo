import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '../config/logger';

export type AgentEventType =
  | 'channel.received' | 'channel.replied' | 'channel.failed'
  | 'workflow.started' | 'workflow.completed' | 'workflow.failed'
  | 'run.started' | 'agent.started' | 'agent.decided' | 'agent.completed' | 'agent.failed'
  | 'run.completed' | 'run.failed' | 'tool.started' | 'tool.completed' | 'tool.failed';
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
  replyPreview?: string;
  parentRunId?: string;
  parentTaskId?: string;
  durationMs?: number;
  tokenUsage?: { input: number; output: number };
  estimatedCostUsd?: number;
  errorCategory?: 'timeout' | 'configuration' | 'validation' | 'tool' | 'model' | 'unknown';
  recoveryStatus?: 'not_attempted' | 'recovered' | 'failed';
}

const MAX_RETAINED_EVENTS = 500;
const recentEvents: AgentEvent[] = [];
const subscribers = new Set<(event: AgentEvent) => void>();
const traceContext = new AsyncLocalStorage<{ runId: string; conversationId: string }>();

export function withAgentTraceContext<T>(context: { runId: string; conversationId: string }, callback: () => Promise<T>): Promise<T> {
  return traceContext.run(context, callback);
}

export function getAgentTraceContext(): { runId: string; conversationId: string } | undefined {
  return traceContext.getStore();
}

export function getRecentAgentEvents(limit = 100): AgentEvent[] {
  return recentEvents.slice(-Math.max(1, Math.min(limit, MAX_RETAINED_EVENTS)));
}

export function subscribeToAgentEvents(subscriber: (event: AgentEvent) => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function createAgentEvent(event: Omit<AgentEvent, 'timestamp'>): AgentEvent {
  const complete = { ...event, timestamp: new Date().toISOString() };
  // Correlation IDs are useful to the dashboard, but conversation identifiers,
  // raw user text, and service payloads do not belong in operational logs.
  const { conversationId: _conversationId, ...safeLogEvent } = complete;
  logger.info('agent_event', { event: safeLogEvent });
  recentEvents.push(complete);
  if (recentEvents.length > MAX_RETAINED_EVENTS) recentEvents.splice(0, recentEvents.length - MAX_RETAINED_EVENTS);
  for (const subscriber of subscribers) {
    try {
      subscriber(complete);
    } catch {
      subscribers.delete(subscriber);
    }
  }
  return complete;
}

export function newRunId(): string {
  return randomUUID();
}
