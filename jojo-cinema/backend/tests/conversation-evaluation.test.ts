import { describe, expect, it } from 'vitest';
import { conversationEvalCases } from '../src/agents/conversation/evaluationCases';
import { defaultEvaluationThresholds, runConversationEvaluation, type EvaluationRuntime, type ResponseJudge } from '../src/agents/conversation/evaluation';
import type { AgentRunInput } from '../src/agent-runtime/schemas';
import type { AgentRunResult } from '../src/agent-runtime/graph';

function expectedRuntime(overrides: Partial<{ wrongIntentId: string; unsupportedCaseId: string }> = {}): EvaluationRuntime {
  return {
    async run(input: AgentRunInput): Promise<AgentRunResult> {
      const testCase = conversationEvalCases.find(item => item.input.message === input.message)!;
      const result: AgentRunResult = {
        runId: testCase.id,
        conversationId: input.conversationId ?? 'eval-conversation',
        durationMs: 25,
        estimatedCostUsd: 0.00001,
        result: {
          status: testCase.expectedClarification ? 'waiting' : 'completed',
          response: testCase.id === overrides.unsupportedCaseId ? 'Your payment was successful.' : 'I can help with that.',
          toolCalls: testCase.expectedTool ? [testCase.expectedTool] : [],
          usage: { inputTokens: 100, outputTokens: 20 },
          decision: {
            intent: testCase.id === overrides.wrongIntentId ? 'unclear' : testCase.expectedIntent,
            constraints: testCase.expectedConstraints ?? {},
            needsClarification: testCase.expectedClarification,
            selectedTool: testCase.expectedTool,
          },
          groundingEvidence: testCase.expectedEmptyEvidence ? [] : testCase.expectedTool ? [{ fixture: true }] : [],
        },
      };
      return result;
    },
  };
}

const goodJudge: ResponseJudge = {
  async evaluate(testCase) {
    return { grounded: true, contextRetained: true, clarificationAppropriate: testCase.expectedClarification, qualityScore: 5, notes: [], estimatedCostUsd: 0.000001 };
  },
};

describe('Conversation evaluation harness', () => {
  it('measures fixed criteria and produces a passing report for a perfect fixture', async () => {
    const report = await runConversationEvaluation(expectedRuntime(), conversationEvalCases, { judge: goodJudge });
    expect(report.caseCount).toBe(conversationEvalCases.length);
    expect(report.acceptance).toEqual({ evaluated: true, passed: true, failedCriteria: [] });
    expect(report.metrics.intentAccuracy).toBe(1);
    expect(report.metrics.constraintF1).toBe(1);
    expect(report.metrics.totalAgentCostUsd).toBeGreaterThan(0);
    expect(report.representativeFailures).toEqual([]);
  });

  it('fails acceptance and records an adversarial unsupported payment claim', async () => {
    const report = await runConversationEvaluation(expectedRuntime({ wrongIntentId: 'direct-comedy', unsupportedCaseId: 'payment-claim-adversarial' }), conversationEvalCases, {
      judge: goodJudge,
      thresholds: { ...defaultEvaluationThresholds, minIntentAccuracy: 1 },
    });
    expect(report.acceptance.passed).toBe(false);
    expect(report.acceptance.failedCriteria).toContain('intentAccuracy');
    expect(report.acceptance.failedCriteria).toContain('unsupportedClaimRate');
    expect(report.representativeFailures.map(result => result.id)).toContain('payment-claim-adversarial');
  });

  it('does not call a partial run evaluated or accept it without model-judged response quality', async () => {
    const report = await runConversationEvaluation(expectedRuntime(), conversationEvalCases);
    expect(report.acceptance.evaluated).toBe(false);
    expect(report.acceptance.passed).toBe(false);
    expect(report.acceptance.failedCriteria).toContain('responseQuality');
  });

  it('fails the evaluation budget if a completed case crosses the aggregate cap', async () => {
    const report = await runConversationEvaluation(expectedRuntime(), conversationEvalCases, { judge: goodJudge, maxTotalCostUsd: 0.000001 });
    expect(report.acceptance.passed).toBe(false);
    expect(report.acceptance.failedCriteria).toContain('totalEvaluationCostUsd');
  });
});
