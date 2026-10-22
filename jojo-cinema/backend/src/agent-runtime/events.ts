import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

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

export function getRecentAgentEvents(limit = 100): AgentEvent[] {
  return recentEvents.slice(-Math.max(1, Math.min(limit, MAX_RETAINED_EVENTS)));
}

export function subscribeToAgentEvents(subscriber: (event: AgentEvent) => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function createAgentEvent(event: Omit<AgentEvent, 'timestamp'>): AgentEvent {
  const complete = { ...event, timestamp: new Date().toISOString() };
  // The runtime owns these events. User text and raw tool payloads are deliberately excluded.
  logger.info('agent_event', { event: complete });
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
