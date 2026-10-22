import { Router } from 'express';
import { createAgentRuntime } from '../agent-runtime/graph';
import { ConversationIntentAgent } from '../agents/conversation/agent';
import { env } from '../config/env';
import { agentRunInputSchema } from '../agent-runtime/schemas';
import { success } from '../types/api';
import { createTelegramPresentation } from '../telegram/presentation';
import { getRecentAgentEvents, subscribeToAgentEvents, type AgentEvent } from '../agent-runtime/events';

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

// POST /api/agent/chat — intended for the Telegram adapter or demo chat client.
router.post('/chat', async (req, res, next) => {
  try {
    const input = agentRunInputSchema.parse(req.body);
    const run = await getRuntime().run(input);
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
