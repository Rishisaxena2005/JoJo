import { Router } from 'express';
import { createAgentRuntime } from '../agent-runtime/graph';
import { ConversationIntentAgent } from '../agents/conversation/agent';
import { env } from '../config/env';
import { agentRunInputSchema } from '../agent-runtime/schemas';
import { success } from '../types/api';
import { createTelegramPresentation } from '../telegram/presentation';

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
