"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentEvent = createAgentEvent;
exports.newRunId = newRunId;
const crypto_1 = require("crypto");
const logger_1 = require("../config/logger");
function createAgentEvent(event) {
    const complete = { ...event, timestamp: new Date().toISOString() };
    // The runtime owns these events. User text and raw tool payloads are deliberately excluded.
    logger_1.logger.info('agent_event', { event: complete });
    return complete;
}
function newRunId() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=events.js.map