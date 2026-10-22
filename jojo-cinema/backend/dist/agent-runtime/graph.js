"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentRuntime = createAgentRuntime;
const crypto_1 = require("crypto");
const langgraph_1 = require("@langchain/langgraph");
const schemas_1 = require("./schemas");
const events_1 = require("./events");
const GraphState = langgraph_1.Annotation.Root({
    runId: (0, langgraph_1.Annotation)(),
    conversationId: (0, langgraph_1.Annotation)(),
    input: (0, langgraph_1.Annotation)(),
    result: (0, langgraph_1.Annotation)(),
});
function createAgentRuntime(agent, options) {
    const workflow = new langgraph_1.StateGraph(GraphState)
        .addNode('executeAgent', async (state) => {
        const startedAt = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs);
        (0, events_1.createAgentEvent)({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.started', status: 'running' });
        try {
            const invocation = agent.invoke(state.input, { runId: state.runId, conversationId: state.conversationId, signal: controller.signal });
            const timeout = new Promise((_resolve, reject) => {
                controller.signal.addEventListener('abort', () => reject(new Error('Agent execution timed out')), { once: true });
            });
            const result = schemas_1.agentResultSchema.parse(await Promise.race([invocation, timeout]));
            const estimatedCostUsd = (result.usage.inputTokens * options.inputCostPer1MUsd + result.usage.outputTokens * options.outputCostPer1MUsd) / 1_000_000;
            if (estimatedCostUsd > options.maxCostUsd)
                throw new Error('Configured per-run model cost limit exceeded');
            const durationMs = Date.now() - startedAt;
            (0, events_1.createAgentEvent)({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.completed', status: result.status, summary: `Agent returned ${result.status}`, replyPreview: result.response.slice(0, 500), durationMs, tokenUsage: { input: result.usage.inputTokens, output: result.usage.outputTokens }, estimatedCostUsd });
            return { result };
        }
        catch (error) {
            const category = controller.signal.aborted ? 'timeout' : 'unknown';
            (0, events_1.createAgentEvent)({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.failed', status: 'failed', summary: 'Agent execution failed', errorCategory: category, recoveryStatus: 'not_attempted', durationMs: Date.now() - startedAt });
            throw error;
        }
        finally {
            clearTimeout(timer);
        }
    })
        .addEdge(langgraph_1.START, 'executeAgent')
        .addEdge('executeAgent', langgraph_1.END)
        .compile();
    return {
        async run(rawInput) {
            const input = schemas_1.agentRunInputSchema.parse(rawInput);
            const startedAt = Date.now();
            const runId = (0, events_1.newRunId)();
            const conversationId = input.conversationId ?? (0, crypto_1.randomUUID)();
            (0, events_1.createAgentEvent)({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.started', status: 'running', summary: 'Agent run started' });
            try {
                const graphResult = await workflow.invoke({ runId, conversationId, input });
                const result = schemas_1.agentResultSchema.parse(graphResult.result);
                const durationMs = Date.now() - startedAt;
                const estimatedCostUsd = (result.usage.inputTokens * options.inputCostPer1MUsd + result.usage.outputTokens * options.outputCostPer1MUsd) / 1_000_000;
                (0, events_1.createAgentEvent)({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.completed', status: result.status, summary: 'Agent run completed', replyPreview: result.response.slice(0, 500), durationMs, tokenUsage: { input: result.usage.inputTokens, output: result.usage.outputTokens }, estimatedCostUsd });
                return { runId, conversationId, result, durationMs, estimatedCostUsd };
            }
            catch (error) {
                const durationMs = Date.now() - startedAt;
                (0, events_1.createAgentEvent)({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.failed', status: 'failed', summary: 'Agent run failed', errorCategory: 'unknown', recoveryStatus: 'not_attempted', durationMs });
                throw error;
            }
        },
        maxCostUsd: options.maxCostUsd,
    };
}
//# sourceMappingURL=graph.js.map