import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../src/app';
import { getRecentAgentEvents } from '../src/agent-runtime/events';

describe('POST /api/agent/trace-event', () => {
  it('accepts content-free channel telemetry and emits a server-defined event', async () => {
    const runId = randomUUID();
    const response = await request(app).post('/api/agent/trace-event').send({ runId, eventType: 'channel.received' });
    expect(response.status).toBe(200);
    const event = getRecentAgentEvents(10).find(item => item.runId === runId);
    expect(event?.summary).toContain('user content hidden');
    expect(event?.conversationId).toBe(`trace-${runId}`);
  });

  it('rejects caller-supplied summaries and unlabelled workflow events', async () => {
    const runId = randomUUID();
    const withRawSummary = await request(app).post('/api/agent/trace-event').send({ runId, eventType: 'channel.received', summary: 'private message' });
    expect(withRawSummary.status).toBe(400);
    const unlabelledWorkflow = await request(app).post('/api/agent/trace-event').send({ runId, eventType: 'workflow.started' });
    expect(unlabelledWorkflow.status).toBe(400);
  });
});
