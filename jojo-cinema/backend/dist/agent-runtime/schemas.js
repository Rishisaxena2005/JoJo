"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentResultSchema = exports.agentRunInputSchema = exports.conversationMessageSchema = void 0;
const zod_1 = require("zod");
exports.conversationMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant']),
    content: zod_1.z.string().min(1).max(4000),
});
exports.agentRunInputSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(4000),
    conversationId: zod_1.z.string().min(1).max(128).optional(),
    history: zod_1.z.array(exports.conversationMessageSchema).max(20).default([]),
});
exports.agentResultSchema = zod_1.z.object({
    status: zod_1.z.enum(['completed', 'waiting', 'failed']),
    response: zod_1.z.string().max(4000),
    rationale: zod_1.z.string().max(500).optional(),
    toolCalls: zod_1.z.array(zod_1.z.string()).default([]),
    usage: zod_1.z.object({ inputTokens: zod_1.z.number().int().nonnegative(), outputTokens: zod_1.z.number().int().nonnegative() }),
    /** Internal decision data for evaluation and routing. Do not send directly to end users. */
    decision: zod_1.z.record(zod_1.z.unknown()).optional(),
    /** Verified tool payloads used for the answer; excluded from event logs. */
    groundingEvidence: zod_1.z.array(zod_1.z.unknown()).optional(),
});
//# sourceMappingURL=schemas.js.map