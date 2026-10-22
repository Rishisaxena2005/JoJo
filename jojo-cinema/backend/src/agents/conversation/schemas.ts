import { z } from 'zod';

export const intentSchema = z.enum([
  'movie_discovery', 'showtime_search', 'seat_selection', 'booking',
  'booking_support', 'train_search', 'general_cinema_help', 'out_of_domain', 'unclear',
]);
export type ConversationIntent = z.infer<typeof intentSchema>;

export const conversationInterpretationSchema = z.object({
  intent: intentSchema,
  constraints: z.object({
    city: z.string().max(80).nullable(),
    date: z.string().max(40).nullable(),
    timePreference: z.string().max(80).nullable(),
    language: z.string().max(50).nullable(),
    genres: z.array(z.string().max(50)).max(8),
    certification: z.string().max(20).nullable(),
    durationPreference: z.string().max(80).nullable(),
  }),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().max(500).nullable(),
  selectedTool: z.enum(['movie_search', 'showtime_search', 'train_search']).nullable(),
  toolArguments: z.object({
    query: z.string().max(80).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    movieTitle: z.string().max(100).nullable().optional(),
    date: z.string().max(40).nullable().optional(),
    language: z.string().max(50).nullable().optional(),
    genre: z.string().max(50).nullable().optional(),
    fromStation: z.string().max(100).nullable().optional(),
    toStation: z.string().max(100).nullable().optional(),
    passengers: z.number().int().min(1).max(100).nullable().optional(),
  }).strict().nullable(),
  responseDraft: z.string().max(2000),
  rationale: z.string().max(500),
});

export const groundedResponseSchema = z.object({
  response: z.string().min(1).max(4000),
  rationale: z.string().max(500),
});

export type ConversationInterpretation = z.infer<typeof conversationInterpretationSchema>;
