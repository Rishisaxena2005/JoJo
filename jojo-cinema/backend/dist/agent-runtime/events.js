"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentAgentEvents = getRecentAgentEvents;
exports.subscribeToAgentEvents = subscribeToAgentEvents;
exports.createAgentEvent = createAgentEvent;
exports.newRunId = newRunId;
const crypto_1 = require("crypto");
const logger_1 = require("../config/logger");
const MAX_RETAINED_EVENTS = 500;
const recentEvents = [];
const subscribers = new Set();
function getRecentAgentEvents(limit = 100) {
    return recentEvents.slice(-Math.max(1, Math.min(limit, MAX_RETAINED_EVENTS)));
}
function subscribeToAgentEvents(subscriber) {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
}
function createAgentEvent(event) {
    const complete = { ...event, timestamp: new Date().toISOString() };
    // The runtime owns these events. User text and raw tool payloads are deliberately excluded.
    logger_1.logger.info('agent_event', { event: complete });
    recentEvents.push(complete);
    if (recentEvents.length > MAX_RETAINED_EVENTS)
        recentEvents.splice(0, recentEvents.length - MAX_RETAINED_EVENTS);
    for (const subscriber of subscribers) {
        try {
            subscriber(complete);
        }
        catch {
            subscribers.delete(subscriber);
        }
    }
    return complete;
}
function newRunId() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=events.js.map