"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const env_1 = require("../../config/env");
const graph_1 = require("../../agent-runtime/graph");
const agent_1 = require("./agent");
const evaluationCases_1 = require("./evaluationCases");
const evaluation_1 = require("./evaluation");
const modelAdapter_1 = require("./modelAdapter");
const model_1 = require("../../agent-runtime/model");
async function main() {
    const model = new modelAdapter_1.OpenAIStructuredModel((0, model_1.createOpenAIModel)());
    const agent = new agent_1.ConversationIntentAgent(model);
    const runtime = (0, graph_1.createAgentRuntime)(agent, {
        timeoutMs: env_1.env.AGENT_TIMEOUT_MS,
        maxCostUsd: env_1.env.AGENT_MAX_COST_USD,
        inputCostPer1MUsd: env_1.env.AGENT_INPUT_COST_PER_1M_USD,
        outputCostPer1MUsd: env_1.env.AGENT_OUTPUT_COST_PER_1M_USD,
    });
    const judge = new evaluation_1.ModelResponseJudge(model, {
        inputCostPer1MUsd: env_1.env.AGENT_INPUT_COST_PER_1M_USD,
        outputCostPer1MUsd: env_1.env.AGENT_OUTPUT_COST_PER_1M_USD,
    });
    const report = await (0, evaluation_1.runConversationEvaluation)(runtime, evaluationCases_1.conversationEvalCases, { judge, maxTotalCostUsd: env_1.env.AGENT_EVAL_MAX_COST_USD });
    const outputDirectory = (0, node_path_1.resolve)(process.cwd(), 'evaluations', 'reports');
    await (0, promises_1.mkdir)(outputDirectory, { recursive: true });
    const filename = `conversation-intent-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const reportPath = (0, node_path_1.resolve)(outputDirectory, filename);
    await (0, promises_1.writeFile)(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ reportPath, acceptance: report.acceptance, metrics: report.metrics }, null, 2));
    if (!report.acceptance.passed)
        process.exitCode = 1;
}
main().catch(error => {
    console.error('Conversation evaluation failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
});
//# sourceMappingURL=runEvaluation.js.map