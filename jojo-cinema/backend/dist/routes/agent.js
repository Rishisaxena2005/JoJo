"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graph_1 = require("../agent-runtime/graph");
const agent_1 = require("../agents/conversation/agent");
const env_1 = require("../config/env");
const schemas_1 = require("../agent-runtime/schemas");
const api_1 = require("../types/api");
const presentation_1 = require("../telegram/presentation");
const events_1 = require("../agent-runtime/events");
const router = (0, express_1.Router)();
let runtime;
function getRuntime() {
    runtime ??= (0, graph_1.createAgentRuntime)(new agent_1.ConversationIntentAgent(), {
        timeoutMs: env_1.env.AGENT_TIMEOUT_MS,
        maxCostUsd: env_1.env.AGENT_MAX_COST_USD,
        inputCostPer1MUsd: env_1.env.AGENT_INPUT_COST_PER_1M_USD,
        outputCostPer1MUsd: env_1.env.AGENT_OUTPUT_COST_PER_1M_USD,
    });
    return runtime;
}
function dashboardEvent(event) {
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
    const unsubscribe = (0, events_1.subscribeToAgentEvents)(event => {
        res.write(`event: agent_event\ndata: ${JSON.stringify(dashboardEvent(event))}\n\n`);
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify((0, events_1.getRecentAgentEvents)(120).map(dashboardEvent))}\n\n`);
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20_000);
    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
});
// POST /api/agent/chat — intended for the Telegram adapter or demo chat client.
router.post('/chat', async (req, res, next) => {
    try {
        const input = schemas_1.agentRunInputSchema.parse(req.body);
        const run = await getRuntime().run(input);
        // Keep internal reasoning, routing decisions, and raw grounding evidence private.
        res.json((0, api_1.success)({
            conversationId: run.conversationId,
            runId: run.runId,
            status: run.result.status,
            reply: run.result.response,
            presentation: (0, presentation_1.createTelegramPresentation)(String(run.result.decision?.intent ?? ''), typeof run.result.decision?.selectedTool === 'string' ? run.result.decision.selectedTool : null, run.result.groundingEvidence ?? []),
        }));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=agent.js.map