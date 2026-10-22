"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graph_1 = require("../agent-runtime/graph");
const agent_1 = require("../agents/conversation/agent");
const env_1 = require("../config/env");
const schemas_1 = require("../agent-runtime/schemas");
const api_1 = require("../types/api");
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
        }));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=agent.js.map