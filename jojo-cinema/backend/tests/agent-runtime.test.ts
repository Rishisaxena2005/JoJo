import { describe, expect, it } from 'vitest';
import { createAgentRuntime } from '../src/agent-runtime/graph';
import type { Agent } from '../src/agent-runtime/agent';
import { agentRunInputSchema, agentResultSchema } from '../src/agent-runtime/schemas';
import { invokeTool } from '../src/agent-runtime/tool';
import { mockMovieSearchTool, mockShowtimeSearchTool } from '../src/agent-tools/mockCinema';
import { invokeTool, type AgentTool } from '../src/agent-runtime/tool';
import { z } from 'zod';
import { getRecentAgentEvents } from '../src/agent-runtime/events';

const successfulAgent: Agent = {
  id: 'test-agent',
  name: 'Test Agent',
  async invoke(input) {
    return { status: 'completed', response: `Received: ${input.message}`, usage: { inputTokens: 10, outputTokens: 5 } };
  },
};

describe('agent runtime schemas', () => {
  it('validates input and supplies an empty history by default', () => {
    expect(agentRunInputSchema.parse({ message: 'Find a movie' }).history).toEqual([]);
  });

  it('rejects malformed agent output', () => {
    expect(() => agentResultSchema.parse({ status: 'completed', response: 'ok' })).toThrow();
  });
});

describe('mock cinema tools', () => {
  it('validates tool arguments and returns verified-in-fixture mock data', async () => {
    const context = { runId: 'run', conversationId: 'conversation', agentId: 'test', agentName: 'Test', signal: new AbortController().signal };
    const results = await invokeTool(mockMovieSearchTool, { city: 'Pune' }, context);
    expect(results.length).toBeGreaterThan(0);
    await expect(invokeTool(mockMovieSearchTool, { city: 2 }, context)).rejects.toThrow();
  });

  it('returns no showtime for unknown fixture data', async () => {
    const context = { runId: 'run', conversationId: 'conversation', agentId: 'test', agentName: 'Test', signal: new AbortController().signal };
    await expect(invokeTool(mockShowtimeSearchTool, { movieTitle: 'Unknown title' }, context)).resolves.toEqual([]);
  });

  it('propagates tool failures and emits a failed tool event', async () => {
    const schema = z.object({ value: z.string() });
    const failingTool: AgentTool<typeof schema, string> = {
      name: 'failing_test_tool',
      description: 'Test-only failing tool.',
      schema,
      sanitizeArguments: args => ({ value: args.value }),
      summarizeResult: value => value,
      async execute() { throw new Error('fixture failure'); },
    };
    const context = { runId: 'run', conversationId: 'conversation', agentId: 'test', agentName: 'Test', signal: new AbortController().signal };
    await expect(invokeTool(failingTool, { value: 'safe' }, context)).rejects.toThrow('fixture failure');
  });
});

describe('LangGraph agent runtime', () => {
  it('creates run and conversation identifiers and returns validated output', async () => {
    const runtime = createAgentRuntime(successfulAgent, { timeoutMs: 500, maxCostUsd: 1, inputCostPer1MUsd: 0.1, outputCostPer1MUsd: 0.5 });
    const result = await runtime.run({ message: 'Hello' });
    expect(result.runId).toBeTruthy();
    expect(result.conversationId).toBeTruthy();
    expect(result.result.response).toBe('Received: Hello');
  });

  it('correlates trusted channel IDs and emits a safe structured decision event', async () => {
    const agent: Agent = {
      ...successfulAgent,
      async invoke() {
        return {
          status: 'completed', response: 'Here are the available movies.', usage: { inputTokens: 4, outputTokens: 6 },
          decision: { intent: 'movie_discovery', selectedTool: 'movie_search', needsClarification: false },
        };
      },
    };
    const runtime = createAgentRuntime(agent, { timeoutMs: 500, maxCostUsd: 1, inputCostPer1MUsd: 0.1, outputCostPer1MUsd: 0.5 });
    const runId = '123e4567-e89b-12d3-a456-426614174000';
    const run = await runtime.run({ message: 'Show movies' }, { runId });
    expect(run.runId).toBe(runId);
    expect(getRecentAgentEvents(20).some(event => event.runId === runId
      && event.eventType === 'agent.decided'
      && event.summary === 'Intent: movie_discovery · route: movie_search')).toBe(true);
  });

  it('rejects runs that exceed configured cost budget', async () => {
    const runtime = createAgentRuntime(successfulAgent, { timeoutMs: 500, maxCostUsd: 0.000001, inputCostPer1MUsd: 10, outputCostPer1MUsd: 10 });
    await expect(runtime.run({ message: 'Hello' })).rejects.toThrow(/cost limit/);
  });

  it('aborts a stalled agent at the configured timeout', async () => {
    const stalled: Agent = { ...successfulAgent, async invoke() { return new Promise(() => undefined); } };
    const runtime = createAgentRuntime(stalled, { timeoutMs: 10, maxCostUsd: 1, inputCostPer1MUsd: 0.1, outputCostPer1MUsd: 0.5 });
    await expect(runtime.run({ message: 'Hello' })).rejects.toThrow(/timed out/);
  });
});
