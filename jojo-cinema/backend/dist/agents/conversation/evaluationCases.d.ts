import type { AgentRunInput } from '../../agent-runtime/schemas';
import type { ConversationIntent } from './schemas';
export interface ConversationEvalCase {
    id: string;
    category: string;
    input: AgentRunInput;
    expectedIntent: ConversationIntent;
    expectedConstraints?: Record<string, string | string[]>;
    expectedClarification: boolean;
    expectedTool: 'movie_search' | 'showtime_search' | null;
    expectedEmptyEvidence?: boolean;
}
export declare const conversationEvalCases: ConversationEvalCase[];
//# sourceMappingURL=evaluationCases.d.ts.map