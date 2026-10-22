import { ChatOpenAI } from '@langchain/openai';
/** Construct on demand so mock-only runs do not need a model provider. */
export declare function createOpenAIModel(): ChatOpenAI;
export interface ModelCostConfig {
    maxCostUsd: number;
    inputCostPer1MUsd: number;
    outputCostPer1MUsd: number;
}
export declare function estimateModelCost(inputTokens: number, outputTokens: number, config: ModelCostConfig): number;
//# sourceMappingURL=model.d.ts.map