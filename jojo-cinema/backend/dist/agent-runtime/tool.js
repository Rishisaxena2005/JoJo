"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeTool = invokeTool;
const events_1 = require("./events");
async function invokeTool(tool, rawArgs, context) {
    const args = tool.schema.parse(rawArgs);
    const startedAt = Date.now();
    (0, events_1.createAgentEvent)({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, from: context.agentName, to: `Tool · ${tool.name}`, eventType: 'handoff.sent', status: 'running', summary: `Request handed to ${tool.name}` });
    (0, events_1.createAgentEvent)({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.started', status: 'running', toolName: tool.name, sanitizedArguments: tool.sanitizeArguments(args) });
    try {
        const result = await tool.execute(args, context);
        (0, events_1.createAgentEvent)({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, from: `Tool · ${tool.name}`, to: context.agentName, eventType: 'handoff.returned', status: 'completed', summary: tool.summarizeResult(result), durationMs: Date.now() - startedAt });
        (0, events_1.createAgentEvent)({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.completed', status: 'completed', toolName: tool.name, toolResultSummary: tool.summarizeResult(result), durationMs: Date.now() - startedAt });
        return result;
    }
    catch (error) {
        (0, events_1.createAgentEvent)({ runId: context.runId, conversationId: context.conversationId, agentId: context.agentId, agentName: context.agentName, eventType: 'tool.failed', status: 'failed', toolName: tool.name, durationMs: Date.now() - startedAt, errorCategory: 'tool', recoveryStatus: 'not_attempted' });
        throw error;
    }
}
//# sourceMappingURL=tool.js.map