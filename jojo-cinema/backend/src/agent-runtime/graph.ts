import { randomUUID } from 'crypto';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { Agent } from './agent';
import { agentRunInputSchema, agentResultSchema, type AgentRunInput, type AgentResult } from './schemas';
import { createAgentEvent, newRunId } from './events';

const GraphState = Annotation.Root({
  runId: Annotation<string>(),
  conversationId: Annotation<string>(),
  input: Annotation<AgentRunInput>(),
  result: Annotation<AgentResult | undefined>(),
});

export interface AgentRuntimeOptions {
  timeoutMs: number;
  maxCostUsd: number;
  inputCostPer1MUsd: number;
  outputCostPer1MUsd: number;
}

export interface AgentRunResult {
  runId: string;
  conversationId: string;
  result: AgentResult;
  durationMs: number;
  estimatedCostUsd: number;
}

export function createAgentRuntime(agent: Agent, options: AgentRuntimeOptions) {
  const workflow = new StateGraph(GraphState)
    .addNode('executeAgent', async state => {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      createAgentEvent({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.started', status: 'running' });
      try {
        const invocation = agent.invoke(state.input, { runId: state.runId, conversationId: state.conversationId, signal: controller.signal });
        const timeout = new Promise<never>((_resolve, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Agent execution timed out')), { once: true });
        });
        const result = agentResultSchema.parse(await Promise.race([invocation, timeout]));
        const estimatedCostUsd = (result.usage.inputTokens * options.inputCostPer1MUsd + result.usage.outputTokens * options.outputCostPer1MUsd) / 1_000_000;
        if (estimatedCostUsd > options.maxCostUsd) throw new Error('Configured per-run model cost limit exceeded');
        const durationMs = Date.now() - startedAt;
        const decision = result.decision ?? {};
        const safeCode = (value: unknown) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/.test(value) ? value : undefined;
        const intent = safeCode(decision.intent);
        const selectedTool = safeCode(decision.selectedTool);
        const needsClarification = decision.needsClarification === true;
        createAgentEvent({
          runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name,
          eventType: 'agent.decided', status: 'completed',
          summary: [intent ? `Intent: ${intent}` : 'Intent classified', selectedTool ? `route: ${selectedTool}` : undefined, needsClarification ? 'clarification needed' : undefined].filter(Boolean).join(' · '),
          ...(selectedTool ? { toolName: selectedTool } : {}),
        });
        createAgentEvent({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.completed', status: result.status, summary: `Agent returned ${result.status}`, replyPreview: result.response.slice(0, 500), durationMs, tokenUsage: { input: result.usage.inputTokens, output: result.usage.outputTokens }, estimatedCostUsd });
        return { result };
      } catch (error) {
        const category = controller.signal.aborted ? 'timeout' : 'unknown';
        createAgentEvent({ runId: state.runId, conversationId: state.conversationId, agentId: agent.id, agentName: agent.name, eventType: 'agent.failed', status: 'failed', summary: 'Agent execution failed', errorCategory: category, recoveryStatus: 'not_attempted', durationMs: Date.now() - startedAt });
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })
    .addEdge(START, 'executeAgent')
    .addEdge('executeAgent', END)
    .compile();

  return {
    async run(rawInput: unknown, runOptions: { runId?: string } = {}): Promise<AgentRunResult> {
      const input = agentRunInputSchema.parse(rawInput);
      const startedAt = Date.now();
      // A channel adapter may supply its UUID so channel, agent, tool, and
      // workflow events form one end-to-end trace without accepting arbitrary IDs.
      const runId = runOptions.runId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runOptions.runId)
        ? runOptions.runId
        : newRunId();
      const conversationId = input.conversationId ?? randomUUID();
      createAgentEvent({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.started', status: 'running', summary: 'Agent run started' });
      try {
        const graphResult = await workflow.invoke({ runId, conversationId, input });
        const result = agentResultSchema.parse(graphResult.result);
        const durationMs = Date.now() - startedAt;
        const estimatedCostUsd = (result.usage.inputTokens * options.inputCostPer1MUsd + result.usage.outputTokens * options.outputCostPer1MUsd) / 1_000_000;
        createAgentEvent({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.completed', status: result.status, summary: 'Agent run completed', replyPreview: result.response.slice(0, 500), durationMs, tokenUsage: { input: result.usage.inputTokens, output: result.usage.outputTokens }, estimatedCostUsd });
        return { runId, conversationId, result, durationMs, estimatedCostUsd };
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        createAgentEvent({ runId, conversationId, agentId: 'orchestrator', agentName: 'Agent runtime', eventType: 'run.failed', status: 'failed', summary: 'Agent run failed', errorCategory: 'unknown', recoveryStatus: 'not_attempted', durationMs });
        throw error;
      }
    },
    maxCostUsd: options.maxCostUsd,
  };
}
