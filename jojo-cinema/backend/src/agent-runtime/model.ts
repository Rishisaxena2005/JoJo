import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env';

/** Construct on demand so mock-only runs do not need a model provider. */
export function createOpenAIModel(): ChatOpenAI {
  if (env.AGENT_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to run an OpenAI-backed agent');
  }
  return new ChatOpenAI({
    apiKey: env.AGENT_PROVIDER === 'ollama' ? 'ollama' : env.OPENAI_API_KEY,
    model: env.AGENT_MODEL,
    timeout: env.AGENT_TIMEOUT_MS,
    maxRetries: env.AGENT_MAX_RETRIES,
    maxTokens: env.AGENT_MAX_OUTPUT_TOKENS,
    ...(env.AGENT_PROVIDER === 'ollama' ? { configuration: { baseURL: env.OLLAMA_BASE_URL } } : {}),
    ...(env.AGENT_PROVIDER === 'ollama' ? { modelKwargs: { reasoning_effort: 'none' } } : {}),
  });
}

export interface ModelCostConfig {
  maxCostUsd: number;
  inputCostPer1MUsd: number;
  outputCostPer1MUsd: number;
}

export function estimateModelCost(inputTokens: number, outputTokens: number, config: ModelCostConfig): number {
  const estimated = inputTokens * config.inputCostPer1MUsd / 1_000_000
    + outputTokens * config.outputCostPer1MUsd / 1_000_000;
  if (estimated > config.maxCostUsd) {
    throw new Error('Configured per-run model cost limit exceeded');
  }
  return estimated;
}
