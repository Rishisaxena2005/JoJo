import { z } from 'zod';
import prisma from '../config/database';

export const conversationStateSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  stage: z.enum(['idle', 'movie_search', 'awaiting_city', 'awaiting_movie', 'awaiting_theatre', 'awaiting_showtime', 'awaiting_seats', 'booking', 'payment', 'recovering']).default('idle'),
  activeIntent: z.string().max(60).nullable().default(null),
  entities: z.object({
    movie: z.string().max(160).nullable().default(null), city: z.string().max(100).nullable().default(null),
    theatre: z.string().max(160).nullable().default(null), date: z.string().max(40).nullable().default(null),
    time: z.string().max(40).nullable().default(null), seatCount: z.number().int().min(1).max(6).nullable().default(null),
    bookingId: z.string().max(100).nullable().default(null),
  }).default({}),
  pendingQuestion: z.object({ type: z.string().max(60), prompt: z.string().max(500) }).nullable().default(null),
  presentedOptions: z.array(z.object({ id: z.string().max(160), label: z.string().max(200), type: z.enum(['movie', 'city', 'theatre', 'showtime', 'seat']) })).max(30).default([]),
  lastTool: z.string().max(80).nullable().default(null),
  trainTask: z.object({
    stage: z.enum(['route', 'date', 'passenger_count', 'option', 'passengers', 'review', 'payment']).default('route'),
    origin: z.string().max(100).nullable().default(null), destination: z.string().max(100).nullable().default(null),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null), passengerCount: z.number().int().min(1).max(100).nullable().default(null),
    passengers: z.array(z.object({
      name: z.string().max(100), age: z.number().int().min(1).max(120),
      category: z.enum(['ADULT', 'CHILD', 'SENIOR']),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).default('UNSPECIFIED'),
      berthPreference: z.enum(['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'NO_PREFERENCE']).default('NO_PREFERENCE'),
    })).max(100).default([]),
    options: z.array(z.object({ inventoryId: z.string().uuid(), trainName: z.string(), trainNumber: z.string(), originName: z.string(), destinationName: z.string(), departureAt: z.string(), arrivalAt: z.string(), durationMinutes: z.number(), classCode: z.string(), availableSeats: z.number(), farePerPassenger: z.number() })).max(30).default([]),
    selectedInventoryId: z.string().uuid().nullable().default(null), bookingId: z.string().uuid().nullable().default(null), bookingReference: z.string().nullable().default(null),
  }).nullable().default(null),
  lastTrainBooking: z.object({
    bookingId: z.string().uuid(), reference: z.string(), inventoryId: z.string().uuid(),
    trainName: z.string(), trainNumber: z.string(), origin: z.string(), destination: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), classCode: z.string(),
    departureAt: z.string(), arrivalAt: z.string(), farePerPassenger: z.number().nonnegative(),
    passengerCount: z.number().int().min(1).max(100),
  }).nullable().default(null),
  updatedAt: z.string().datetime().nullable().default(null),
}).strict();

export type ConversationState = z.infer<typeof conversationStateSchema>;
export type ConversationMessage = { role: 'user' | 'assistant'; content: string };
const MAX_HISTORY = 20;
const STATE_TTL_MS = 24 * 60 * 60 * 1000;

export async function loadTelegramConversation(chatId: string, userId: string, updateId: number) {
  let row = await prisma.telegramConversation.findUnique({ where: { chatId_userId: { chatId, userId } } });
  if (row?.processedUpdateIds.includes(BigInt(updateId))) return { duplicate: true, history: [] as ConversationMessage[], state: conversationStateSchema.parse({}) };
  if (!row) {
    row = await prisma.telegramConversation.create({ data: { chatId, userId } });
  }
  const isStale = Date.now() - row.lastActivityAt.getTime() > STATE_TTL_MS;
  const history = isStale ? [] : conversationHistorySchema.parse(row.messages);
  const state = isStale ? conversationStateSchema.parse({}) : conversationStateSchema.safeParse(row.state).success
    ? conversationStateSchema.parse(row.state) : conversationStateSchema.parse({});
  return { duplicate: false, history, state, version: row.version };
}

const conversationHistorySchema = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).max(40);

export async function saveTelegramConversation(input: {
  chatId: string; userId: string; updateId: number; history: ConversationMessage[]; state: ConversationState;
}) {
  const history = input.history.slice(-MAX_HISTORY);
  const updatedState = conversationStateSchema.parse({ ...input.state, updatedAt: new Date().toISOString() });
  const current = await prisma.telegramConversation.findUnique({ where: { chatId_userId: { chatId: input.chatId, userId: input.userId } } });
  const ids = [...(current?.processedUpdateIds ?? []), BigInt(input.updateId)].slice(-100);
  await prisma.telegramConversation.upsert({
    where: { chatId_userId: { chatId: input.chatId, userId: input.userId } },
    create: { chatId: input.chatId, userId: input.userId, messages: history, state: updatedState, processedUpdateIds: ids },
    update: { messages: history, state: updatedState, processedUpdateIds: ids, version: { increment: 1 }, lastActivityAt: new Date() },
  });
}

export function stateFromTurn(state: ConversationState, userText: string, reply: string): ConversationState {
  const next: ConversationState = { ...state, entities: { ...state.entities }, pendingQuestion: null, presentedOptions: [] };
  const cityPrompt = /which city|what city|city should/i.test(reply);
  const moviePrompt = /which movie|what movie|choose a movie/i.test(reply);
  const theatrePrompt = /which (?:cinema|theatre|theater)|choose a (?:cinema|theatre|theater)/i.test(reply);
  const showPrompt = /which showtime|which time|choose a show/i.test(reply);
  next.pendingQuestion = cityPrompt ? { type: 'city', prompt: reply } : moviePrompt ? { type: 'movie', prompt: reply }
    : theatrePrompt ? { type: 'theatre', prompt: reply } : showPrompt ? { type: 'showtime', prompt: reply } : null;
  next.stage = cityPrompt ? 'awaiting_city' : moviePrompt ? 'awaiting_movie' : theatrePrompt ? 'awaiting_theatre' : showPrompt ? 'awaiting_showtime' : 'idle';
  if (next.pendingQuestion) next.activeIntent = 'guided_browse';
  if (state.pendingQuestion?.type === 'city' && userText.trim()) next.entities.city = userText.trim();
  if (state.pendingQuestion?.type === 'movie' && userText.trim()) next.entities.movie = userText.trim();
  if (state.pendingQuestion?.type === 'theatre' && userText.trim()) next.entities.theatre = userText.trim();
  return conversationStateSchema.parse(next);
}
