import type { AgentRunResult } from '../../agent-runtime/graph';
import type { AgentRunInput } from '../../agent-runtime/schemas';
import type { StructuredModel } from './modelAdapter';
import type { ConversationEvalCase } from './evaluationCases';
export interface EvaluationRuntime {
    run(input: AgentRunInput): Promise<AgentRunResult>;
}
export interface JudgeResult {
    grounded: boolean;
    contextRetained: boolean;
    clarificationAppropriate: boolean;
    qualityScore: number;
    notes: string[];
    estimatedCostUsd: number;
}
export interface ResponseJudge {
    evaluate(testCase: ConversationEvalCase, result: AgentRunResult, signal: AbortSignal): Promise<JudgeResult>;
}
export declare class ModelResponseJudge implements ResponseJudge {
    private readonly model;
    private readonly rates;
    constructor(model: StructuredModel, rates: {
        inputCostPer1MUsd: number;
        outputCostPer1MUsd: number;
    });
    evaluate(testCase: ConversationEvalCase, result: AgentRunResult, signal: AbortSignal): Promise<JudgeResult>;
}
export interface EvaluationThresholds {
    minIntentAccuracy: number;
    minConstraintF1: number;
    minClarificationAccuracy: number;
    minToolSelectionAccuracy: number;
    minContextRetention: number;
    minClarificationQuality: number;
    minResponseQuality: number;
    maxUnsupportedClaimRate: number;
    maxP95LatencyMs: number;
    maxMeanAgentCostUsd: number;
}
export declare const defaultEvaluationThresholds: EvaluationThresholds;
export interface EvaluationCaseResult {
    id: string;
    category: string;
    passed: boolean;
    response?: string;
    expectedIntent: string;
    actualIntent?: string;
    expectedClarification: boolean;
    actualClarification?: boolean;
    expectedTool: string | null;
    actualTool?: string | null;
    constraintTruePositives: number;
    expectedConstraintCount: number;
    extractedConstraintCount: number;
    latencyMs?: number;
    agentCostUsd?: number;
    judge?: Omit<JudgeResult, 'estimatedCostUsd'>;
    judgeCostUsd?: number;
    errorCategory?: string;
    errorMessage?: string;
    unsupportedClaimDetected?: boolean;
}
export interface EvaluationReport {
    schemaVersion: 1;
    runAt: string;
    caseCount: number;
    metrics: {
        intentAccuracy: number;
        constraintPrecision: number;
        constraintRecall: number;
        constraintF1: number;
        clarificationAccuracy: number;
        toolSelectionAccuracy: number;
        contextRetention: number | null;
        clarificationQuestionQuality: number | null;
        responseQuality: number | null;
        unsupportedClaimRate: number;
        p95LatencyMs: number | null;
        meanAgentCostUsd: number | null;
        totalAgentCostUsd: number;
        totalJudgeCostUsd: number;
    };
    thresholds: EvaluationThresholds;
    acceptance: {
        evaluated: boolean;
        passed: boolean;
        failedCriteria: string[];
    };
    caseResults: EvaluationCaseResult[];
    representativeFailures: EvaluationCaseResult[];
}
export declare function runConversationEvaluation(runtime: EvaluationRuntime, cases: ConversationEvalCase[], options?: {
    judge?: ResponseJudge;
    thresholds?: EvaluationThresholds;
    judgeTimeoutMs?: number;
    maxTotalCostUsd?: number;
}): Promise<EvaluationReport>;
//# sourceMappingURL=evaluation.d.ts.map