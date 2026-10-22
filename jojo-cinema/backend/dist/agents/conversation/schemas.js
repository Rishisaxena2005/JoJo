"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groundedResponseSchema = exports.conversationInterpretationSchema = exports.intentSchema = void 0;
const zod_1 = require("zod");
exports.intentSchema = zod_1.z.enum([
    'movie_discovery', 'showtime_search', 'seat_selection', 'booking',
    'booking_support', 'train_search', 'general_cinema_help', 'out_of_domain', 'unclear',
]);
exports.conversationInterpretationSchema = zod_1.z.object({
    intent: exports.intentSchema,
    constraints: zod_1.z.object({
        city: zod_1.z.string().max(80).nullable(),
        date: zod_1.z.string().max(40).nullable(),
        timePreference: zod_1.z.string().max(80).nullable(),
        language: zod_1.z.string().max(50).nullable(),
        genres: zod_1.z.array(zod_1.z.string().max(50)).max(8),
        certification: zod_1.z.string().max(20).nullable(),
        durationPreference: zod_1.z.string().max(80).nullable(),
    }),
    needsClarification: zod_1.z.boolean(),
    clarificationQuestion: zod_1.z.string().max(500).nullable(),
    selectedTool: zod_1.z.enum(['movie_search', 'showtime_search', 'train_search']).nullable(),
    toolArguments: zod_1.z.object({
        query: zod_1.z.string().max(80).nullable().optional(),
        city: zod_1.z.string().max(80).nullable().optional(),
        movieTitle: zod_1.z.string().max(100).nullable().optional(),
        date: zod_1.z.string().max(40).nullable().optional(),
        language: zod_1.z.string().max(50).nullable().optional(),
        genre: zod_1.z.string().max(50).nullable().optional(),
        fromStation: zod_1.z.string().max(100).nullable().optional(),
        toStation: zod_1.z.string().max(100).nullable().optional(),
        passengers: zod_1.z.number().int().min(1).max(100).nullable().optional(),
    }).strict().nullable(),
    responseDraft: zod_1.z.string().max(2000),
    rationale: zod_1.z.string().max(500),
});
exports.groundedResponseSchema = zod_1.z.object({
    response: zod_1.z.string().min(1).max(4000),
    rationale: zod_1.z.string().max(500),
});
//# sourceMappingURL=schemas.js.map