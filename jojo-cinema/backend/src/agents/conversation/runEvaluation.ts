import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '../../config/env';
import { createAgentRuntime } from '../../agent-runtime/graph';
import { ConversationIntentAgent } from './agent';
import { conversationEvalCases } from './evaluationCases';
import { ModelResponseJudge, runConversationEvaluation } from './evaluation';
import { OpenAIStructuredModel } from './modelAdapter';
import { createOpenAIModel } from '../../agent-runtime/model';

async function main() {
  const model = new OpenAIStructuredModel(createOpenAIModel());
  const agent = new ConversationIntentAgent(model);
  const runtime = createAgentRuntime(agent, {
    timeoutMs: env.AGENT_TIMEOUT_MS,
    maxCostUsd: env.AGENT_MAX_COST_USD,
    inputCostPer1MUsd: env.AGENT_INPUT_COST_PER_1M_USD,
    outputCostPer1MUsd: env.AGENT_OUTPUT_COST_PER_1M_USD,
  });
  const judge = new ModelResponseJudge(model, {
    inputCostPer1MUsd: env.AGENT_INPUT_COST_PER_1M_USD,
    outputCostPer1MUsd: env.AGENT_OUTPUT_COST_PER_1M_USD,
  });
  const report = await runConversationEvaluation(runtime, conversationEvalCases, { judge, maxTotalCostUsd: env.AGENT_EVAL_MAX_COST_USD });
  const outputDirectory = resolve(process.cwd(), 'evaluations', 'reports');
  await mkdir(outputDirectory, { recursive: true });
  const filename = `conversation-intent-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const reportPath = resolve(outputDirectory, filename);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ reportPath, acceptance: report.acceptance, metrics: report.metrics }, null, 2));
  if (!report.acceptance.passed) process.exitCode = 1;
}

main().catch(error => {
  console.error('Conversation evaluation failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
