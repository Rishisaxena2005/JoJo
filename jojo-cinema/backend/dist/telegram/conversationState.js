"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationStateSchema = void 0;
exports.loadTelegramConversation = loadTelegramConversation;
exports.saveTelegramConversation = saveTelegramConversation;
exports.stateFromTurn = stateFromTurn;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
exports.conversationStateSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal(1).default(1),
    stage: zod_1.z.enum(['idle', 'movie_search', 'awaiting_city', 'awaiting_movie', 'awaiting_theatre', 'awaiting_showtime', 'awaiting_seats', 'booking', 'payment', 'recovering']).default('idle'),
    activeIntent: zod_1.z.string().max(60).nullable().default(null),
    entities: zod_1.z.object({
        movie: zod_1.z.string().max(160).nullable().default(null), city: zod_1.z.string().max(100).nullable().default(null),
        theatre: zod_1.z.string().max(160).nullable().default(null), date: zod_1.z.string().max(40).nullable().default(null),
        time: zod_1.z.string().max(40).nullable().default(null), seatCount: zod_1.z.number().int().min(1).max(6).nullable().default(null),
        bookingId: zod_1.z.string().max(100).nullable().default(null),
    }).default({}),
    pendingQuestion: zod_1.z.object({ type: zod_1.z.string().max(60), prompt: zod_1.z.string().max(500) }).nullable().default(null),
    presentedOptions: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string().max(160), label: zod_1.z.string().max(200), type: zod_1.z.enum(['movie', 'city', 'theatre', 'showtime', 'seat']) })).max(30).default([]),
    lastTool: zod_1.z.string().max(80).nullable().default(null),
    trainTask: zod_1.z.object({
        stage: zod_1.z.enum(['route', 'date', 'passenger_count', 'option', 'passengers', 'review', 'payment']).default('route'),
        origin: zod_1.z.string().max(100).nullable().default(null), destination: zod_1.z.string().max(100).nullable().default(null),
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null), passengerCount: zod_1.z.number().int().min(1).max(100).nullable().default(null),
        passengers: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().max(100), age: zod_1.z.number().int().min(1).max(120),
            category: zod_1.z.enum(['ADULT', 'CHILD', 'SENIOR']),
            gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).default('UNSPECIFIED'),
            berthPreference: zod_1.z.enum(['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'NO_PREFERENCE']).default('NO_PREFERENCE'),
        })).max(100).default([]),
        options: zod_1.z.array(zod_1.z.object({ inventoryId: zod_1.z.string().uuid(), trainName: zod_1.z.string(), trainNumber: zod_1.z.string(), originName: zod_1.z.string(), destinationName: zod_1.z.string(), departureAt: zod_1.z.string(), arrivalAt: zod_1.z.string(), durationMinutes: zod_1.z.number(), classCode: zod_1.z.string(), availableSeats: zod_1.z.number(), farePerPassenger: zod_1.z.number() })).max(30).default([]),
        selectedInventoryId: zod_1.z.string().uuid().nullable().default(null), bookingId: zod_1.z.string().uuid().nullable().default(null), bookingReference: zod_1.z.string().nullable().default(null),
    }).nullable().default(null),
    lastTrainBooking: zod_1.z.object({
        bookingId: zod_1.z.string().uuid(), reference: zod_1.z.string(), inventoryId: zod_1.z.string().uuid(),
        trainName: zod_1.z.string(), trainNumber: zod_1.z.string(), origin: zod_1.z.string(), destination: zod_1.z.string(),
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), classCode: zod_1.z.string(),
        departureAt: zod_1.z.string(), arrivalAt: zod_1.z.string(), farePerPassenger: zod_1.z.number().nonnegative(),
        passengerCount: zod_1.z.number().int().min(1).max(100),
    }).nullable().default(null),
    updatedAt: zod_1.z.string().datetime().nullable().default(null),
}).strict();
const MAX_HISTORY = 20;
const STATE_TTL_MS = 24 * 60 * 60 * 1000;
async function loadTelegramConversation(chatId, userId, updateId) {
    let row = await database_1.default.telegramConversation.findUnique({ where: { chatId_userId: { chatId, userId } } });
    if (row?.processedUpdateIds.includes(BigInt(updateId)))
        return { duplicate: true, history: [], state: exports.conversationStateSchema.parse({}) };
    if (!row) {
        row = await database_1.default.telegramConversation.create({ data: { chatId, userId } });
    }
    const isStale = Date.now() - row.lastActivityAt.getTime() > STATE_TTL_MS;
    const history = isStale ? [] : conversationHistorySchema.parse(row.messages);
    const state = isStale ? exports.conversationStateSchema.parse({}) : exports.conversationStateSchema.safeParse(row.state).success
        ? exports.conversationStateSchema.parse(row.state) : exports.conversationStateSchema.parse({});
    return { duplicate: false, history, state, version: row.version };
}
const conversationHistorySchema = zod_1.z.array(zod_1.z.object({ role: zod_1.z.enum(['user', 'assistant']), content: zod_1.z.string().min(1).max(4000) })).max(40);
async function saveTelegramConversation(input) {
    const history = input.history.slice(-MAX_HISTORY);
    const updatedState = exports.conversationStateSchema.parse({ ...input.state, updatedAt: new Date().toISOString() });
    const current = await database_1.default.telegramConversation.findUnique({ where: { chatId_userId: { chatId: input.chatId, userId: input.userId } } });
    const ids = [...(current?.processedUpdateIds ?? []), BigInt(input.updateId)].slice(-100);
    await database_1.default.telegramConversation.upsert({
        where: { chatId_userId: { chatId: input.chatId, userId: input.userId } },
        create: { chatId: input.chatId, userId: input.userId, messages: history, state: updatedState, processedUpdateIds: ids },
        update: { messages: history, state: updatedState, processedUpdateIds: ids, version: { increment: 1 }, lastActivityAt: new Date() },
    });
}
function stateFromTurn(state, userText, reply) {
    const next = { ...state, entities: { ...state.entities }, pendingQuestion: null, presentedOptions: [] };
    const cityPrompt = /which city|what city|city should/i.test(reply);
    const moviePrompt = /which movie|what movie|choose a movie/i.test(reply);
    const theatrePrompt = /which (?:cinema|theatre|theater)|choose a (?:cinema|theatre|theater)/i.test(reply);
    const showPrompt = /which showtime|which time|choose a show/i.test(reply);
    next.pendingQuestion = cityPrompt ? { type: 'city', prompt: reply } : moviePrompt ? { type: 'movie', prompt: reply }
        : theatrePrompt ? { type: 'theatre', prompt: reply } : showPrompt ? { type: 'showtime', prompt: reply } : null;
    next.stage = cityPrompt ? 'awaiting_city' : moviePrompt ? 'awaiting_movie' : theatrePrompt ? 'awaiting_theatre' : showPrompt ? 'awaiting_showtime' : 'idle';
    if (next.pendingQuestion)
        next.activeIntent = 'guided_browse';
    if (state.pendingQuestion?.type === 'city' && userText.trim())
        next.entities.city = userText.trim();
    if (state.pendingQuestion?.type === 'movie' && userText.trim())
        next.entities.movie = userText.trim();
    if (state.pendingQuestion?.type === 'theatre' && userText.trim())
        next.entities.theatre = userText.trim();
    return exports.conversationStateSchema.parse(next);
}
//# sourceMappingURL=conversationState.js.map