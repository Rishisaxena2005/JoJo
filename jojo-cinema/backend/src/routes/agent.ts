import { Router } from 'express';
import { z } from 'zod';
import { createAgentRuntime } from '../agent-runtime/graph';
import { ConversationIntentAgent } from '../agents/conversation/agent';
import { env } from '../config/env';
import { agentRunInputSchema } from '../agent-runtime/schemas';
import { success } from '../types/api';
import { createTelegramPresentation } from '../telegram/presentation';
import { createAgentEvent, getRecentAgentEvents, subscribeToAgentEvents, type AgentEvent } from '../agent-runtime/events';

const router = Router();
let runtime: ReturnType<typeof createAgentRuntime> | undefined;
function getRuntime() {
  runtime ??= createAgentRuntime(new ConversationIntentAgent(), {
    timeoutMs: env.AGENT_TIMEOUT_MS,
    maxCostUsd: env.AGENT_MAX_COST_USD,
    inputCostPer1MUsd: env.AGENT_INPUT_COST_PER_1M_USD,
    outputCostPer1MUsd: env.AGENT_OUTPUT_COST_PER_1M_USD,
  });
  return runtime;
}

function dashboardEvent(event: AgentEvent) {
  const { conversationId: _conversationId, ...safeEvent } = event;
  return safeEvent;
}

const traceEventSchema = z.object({
  runId: z.string().uuid(),
  eventType: z.enum(['channel.received', 'channel.replied', 'channel.failed', 'workflow.started', 'workflow.completed', 'workflow.failed']),
  workflow: z.enum(['movie', 'train']).optional(),
  durationMs: z.number().int().nonnegative().max(300_000).optional(),
}).strict();

const traceSummary: Record<string, string> = {
  'channel.received': 'Incoming Telegram action accepted · user content hidden',
  'channel.replied': 'Reply delivered over Telegram',
  'channel.failed': 'Telegram turn failed before delivery',
  'workflow.started': 'Booking workflow started',
  'workflow.completed': 'Booking workflow handled this turn',
  'workflow.failed': 'Booking workflow failed',
};

// GET /api/agent/events — operational trace for the local/demo agent dashboard.
router.get('/events', (req, res) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const unsubscribe = subscribeToAgentEvents(event => {
    res.write(`event: agent_event\ndata: ${JSON.stringify(dashboardEvent(event))}\n\n`);
  });
  res.write(`event: snapshot\ndata: ${JSON.stringify(getRecentAgentEvents(120).map(dashboardEvent))}\n\n`);
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// POST /api/agent/trace-event — bounded, content-free telemetry from the
// separate Telegram polling process. Event labels are server-selected; caller
// supplied summaries, user text, and payloads are never accepted.
router.post('/trace-event', (req, res) => {
  const parsed = traceEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: { code: 'INVALID_TRACE_EVENT', message: 'Invalid trace event.' } });
  const event = parsed.data;
  const isWorkflowEvent = event.eventType.startsWith('workflow.');
  if (isWorkflowEvent !== Boolean(event.workflow)) return res.status(400).json({ success: false, data: null, error: { code: 'INVALID_TRACE_EVENT', message: 'A workflow label is required only for workflow events.' } });
  const isFailed = event.eventType.endsWith('.failed');
  const isStarted = event.eventType.endsWith('.started');
  const workflowName = event.workflow === 'train' ? 'Train booking workflow' : 'Movie booking workflow';
  createAgentEvent({
    runId: event.runId,
    conversationId: `trace-${event.runId}`,
    agentId: isWorkflowEvent ? `${event.workflow}-booking-flow` : 'telegram-adapter',
    agentName: isWorkflowEvent ? workflowName : 'Telegram adapter',
    eventType: event.eventType,
    status: isFailed ? 'failed' : isStarted ? 'running' : 'completed',
    summary: isWorkflowEvent ? `${workflowName}: ${traceSummary[event.eventType].toLowerCase()}` : traceSummary[event.eventType],
    ...(event.durationMs !== undefined ? { durationMs: event.durationMs } : {}),
    ...(isFailed ? { errorCategory: 'unknown' as const, recoveryStatus: 'not_attempted' as const } : {}),
  });
  return res.json(success({ accepted: true }));
});

// POST /api/agent/chat — intended for the Telegram adapter or demo chat client.
router.post('/chat', async (req, res, next) => {
  try {
    const input = agentRunInputSchema.parse(req.body);
    const run = await getRuntime().run(input, { runId: req.header('x-jojo-run-id') });
    // Keep internal reasoning, routing decisions, and raw grounding evidence private.
    res.json(success({
      conversationId: run.conversationId,
      runId: run.runId,
      status: run.result.status,
      reply: run.result.response,
      presentation: createTelegramPresentation(
        String(run.result.decision?.intent ?? ''),
        typeof run.result.decision?.selectedTool === 'string' ? run.result.decision.selectedTool : null,
        run.result.groundingEvidence ?? [],
      ),
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
