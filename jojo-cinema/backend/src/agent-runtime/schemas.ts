import { z } from 'zod';

export const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const agentRunInputSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().min(1).max(128).optional(),
  history: z.array(conversationMessageSchema).max(20).default([]),
});

export const agentResultSchema = z.object({
  status: z.enum(['completed', 'waiting', 'failed']),
  response: z.string().max(4000),
  rationale: z.string().max(500).optional(),
  toolCalls: z.array(z.string()).default([]),
  usage: z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative() }),
  /** Internal decision data for evaluation and routing. Do not send directly to end users. */
  decision: z.record(z.unknown()).optional(),
  /** Verified tool payloads used for the answer; excluded from event logs. */
  groundingEvidence: z.array(z.unknown()).optional(),
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
