"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIModel = createOpenAIModel;
exports.estimateModelCost = estimateModelCost;
const openai_1 = require("@langchain/openai");
const env_1 = require("../config/env");
/** Construct on demand so mock-only runs do not need a model provider. */
function createOpenAIModel() {
    if (env_1.env.AGENT_PROVIDER === 'openai' && !env_1.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required to run an OpenAI-backed agent');
    }
    return new openai_1.ChatOpenAI({
        apiKey: env_1.env.AGENT_PROVIDER === 'ollama' ? 'ollama' : env_1.env.OPENAI_API_KEY,
        model: env_1.env.AGENT_MODEL,
        timeout: env_1.env.AGENT_TIMEOUT_MS,
        maxRetries: env_1.env.AGENT_MAX_RETRIES,
        maxTokens: env_1.env.AGENT_MAX_OUTPUT_TOKENS,
        ...(env_1.env.AGENT_PROVIDER === 'ollama' ? { configuration: { baseURL: env_1.env.OLLAMA_BASE_URL } } : {}),
        ...(env_1.env.AGENT_PROVIDER === 'ollama' ? { modelKwargs: { reasoning_effort: 'none' } } : {}),
    });
}
function estimateModelCost(inputTokens, outputTokens, config) {
    const estimated = inputTokens * config.inputCostPer1MUsd / 1_000_000
        + outputTokens * config.outputCostPer1MUsd / 1_000_000;
    if (estimated > config.maxCostUsd) {
        throw new Error('Configured per-run model cost limit exceeded');
    }
    return estimated;
}
//# sourceMappingURL=model.js.map