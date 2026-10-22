"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationIntentAgent = void 0;
exports.validateInterpretation = validateInterpretation;
const tool_1 = require("../../agent-runtime/tool");
const cinema_1 = require("../../agent-tools/cinema");
const database_1 = __importDefault(require("../../config/database"));
const schemas_1 = require("./schemas");
const modelAdapter_1 = require("./modelAdapter");
function formatShowtimeRecords(records) {
    if (!records.length)
        return 'I couldn’t find matching showtimes in the current cinema listings. Please check the movie, city, or date and try again.';
    return `I found these showtimes in the current cinema listings:\n${records.slice(0, 8).map(show => {
        const city = show.screen?.theatre?.city?.name;
        const theatre = show.screen?.theatre?.name;
        const movie = show.movie?.title ?? 'Movie';
        const timezone = show.screen?.theatre?.timezone ?? 'Asia/Kolkata';
        const start = new Date(show.startTime);
        const time = Number.isNaN(start.getTime()) ? String(show.startTime) : new Intl.DateTimeFormat('en-IN', {
            timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        }).format(start);
        const minimum = show.priceRange?.min;
        const maximum = show.priceRange?.max;
        const prices = typeof minimum === 'number' && typeof maximum === 'number'
            ? (minimum === maximum ? `₹${minimum} per seat` : `₹${minimum}–₹${maximum} per seat`)
            : 'price not available';
        const available = show.availability?.available;
        return `• ${movie} — ${time}${theatre ? `, ${theatre}` : ''}${city ? `, ${city}` : ''}; ${prices}${typeof available === 'number' ? `; ${available} seats available` : ''}`;
    }).join('\n')}`;
}
class ConversationIntentAgent {
    model;
    id = 'conversation-intent';
    name = 'Conversation and Intent Agent';
    constructor(model = new modelAdapter_1.OpenAIStructuredModel()) {
        this.model = model;
    }
    async invoke(input, context) {
        const normalizedMessage = input.message.trim().toLocaleLowerCase();
        const toolContext = {
            runId: context.runId,
            conversationId: context.conversationId,
            agentId: this.id,
            agentName: this.name,
            signal: context.signal,
        };
        const previousAssistantMessage = [...input.history].reverse().find(message => message.role === 'assistant')?.content ?? '';
        if (/^(yes|yeah|yep|sure|okay|ok)$/i.test(normalizedMessage)
            && /booking a movie at jojo cinema/i.test(previousAssistantMessage)) {
            return {
                status: 'waiting',
                response: 'Sure. Which movie would you like to book, and in which city?',
                rationale: 'The user confirmed booking help; movie and city are needed to continue.',
                toolCalls: [],
                usage: { inputTokens: 0, outputTokens: 0 },
                decision: { intent: 'booking', constraints: {}, needsClarification: true, selectedTool: null },
            };
        }
        // Handle the most common open-ended recommendation request without asking the
        // small local model to infer intent or generate unsupported movie facts.
        if (/^(please\s+)?(suggest|recommend|pick)\s+(me\s+)?(any|a|one)\s+(good\s+)?(movie|film)[.!?]*$/i.test(input.message.trim())) {
            const movies = await (0, tool_1.invokeTool)(cinema_1.movieSearchTool, {}, toolContext);
            const selected = movies.slice(0, 5);
            const response = selected.length
                ? `Here are some movies currently listed at JoJo Cinema:\n${selected.map(movie => `• ${movie.title} (${movie.language}; ${movie.genres.join(', ')})`).join('\n')}\n\nTell me your city or a movie title if you’d like showtimes and prices.`
                : 'I couldn’t find any movies currently listed. Please try again after the cinema listings are available.';
            return {
                status: 'completed',
                response,
                rationale: 'Movie titles and details are taken from the cinema database.',
                toolCalls: [cinema_1.movieSearchTool.name],
                usage: { inputTokens: 0, outputTokens: 0 },
                decision: { intent: 'movie_discovery', constraints: {}, needsClarification: false, selectedTool: 'movie_search' },
                groundingEvidence: selected,
            };
        }
        if (/\b(showtimes?|show\s+times?|show\s+timings?|screenings?|ticket\s+prices?|how\s+much|cost)\b/i.test(input.message)) {
            const movies = await (0, tool_1.invokeTool)(cinema_1.movieSearchTool, {}, toolContext);
            const normalizedRequest = input.message.toLocaleLowerCase();
            const movie = movies
                .filter(candidate => normalizedRequest.includes(candidate.title.toLocaleLowerCase()))
                .sort((left, right) => right.title.length - left.title.length)[0];
            if (!movie) {
                return {
                    status: 'waiting',
                    response: 'Which movie would you like showtimes or ticket prices for?',
                    rationale: 'A movie title is needed to look up showtimes.',
                    toolCalls: [cinema_1.movieSearchTool.name],
                    usage: { inputTokens: 0, outputTokens: 0 },
                    decision: { intent: 'showtime_search', constraints: {}, needsClarification: true, selectedTool: null },
                    groundingEvidence: movies,
                };
            }
            const cities = await database_1.default.city.findMany({ select: { name: true } });
            const city = cities.find(candidate => normalizedRequest.includes(candidate.name.toLocaleLowerCase()))?.name;
            const explicitCity = input.message.match(/\b(?:in|at)\s+([A-Za-z][A-Za-z -]*?)(?=\s+(?:on|for|today|tonight|tomorrow|at|around|after|before)\b|[?.!,]|$)/i)?.[1]?.trim();
            if (explicitCity && !city) {
                const locationList = cities.map(candidate => candidate.name).join(', ');
                return {
                    status: 'completed',
                    response: `I don’t see ${explicitCity} among current JoJo Cinema locations.${locationList ? ` Available cities: ${locationList}.` : ''}`,
                    rationale: 'The requested city does not match a location in the cinema database.',
                    toolCalls: [cinema_1.movieSearchTool.name],
                    usage: { inputTokens: 0, outputTokens: 0 },
                    decision: { intent: 'showtime_search', constraints: { city: explicitCity }, needsClarification: false, selectedTool: null },
                    groundingEvidence: cities,
                };
            }
            const dateMatch = input.message.match(/\b(today|tonight|tomorrow|\d{4}-\d{2}-\d{2})\b/i)?.[0];
            const shows = await (0, tool_1.invokeTool)(cinema_1.showtimeSearchTool, {
                movieTitle: movie.title,
                ...(city ? { city } : {}),
                ...(dateMatch ? { date: dateMatch.toLocaleLowerCase() } : {}),
            }, toolContext);
            return {
                status: 'completed',
                response: formatShowtimeRecords(shows),
                rationale: 'Showtimes, prices, and availability are formatted from verified cinema database results.',
                toolCalls: [cinema_1.movieSearchTool.name, cinema_1.showtimeSearchTool.name],
                usage: { inputTokens: 0, outputTokens: 0 },
                decision: { intent: 'showtime_search', constraints: { city: city ?? null, date: dateMatch ?? null }, needsClarification: false, selectedTool: 'showtime_search' },
                groundingEvidence: shows,
            };
        }
        const messages = (0, modelAdapter_1.makeConversationMessages)(input.history, input.message);
        const interpretationResult = await this.model.generate(schemas_1.conversationInterpretationSchema, messages, context.signal);
        const interpretation = schemas_1.conversationInterpretationSchema.parse(interpretationResult.value);
        let inputTokens = interpretationResult.usage.inputTokens;
        let outputTokens = interpretationResult.usage.outputTokens;
        const calls = [];
        if (interpretation.needsClarification) {
            return {
                status: 'waiting',
                response: interpretation.clarificationQuestion ?? 'What would you like help with?',
                rationale: interpretation.rationale,
                toolCalls: calls,
                usage: { inputTokens, outputTokens },
                decision: { intent: interpretation.intent, constraints: interpretation.constraints, needsClarification: true, selectedTool: null },
            };
        }
        if (!interpretation.selectedTool || !['movie_discovery', 'showtime_search'].includes(interpretation.intent)) {
            return {
                status: interpretation.intent === 'unclear' ? 'waiting' : 'completed',
                response: interpretation.responseDraft,
                rationale: interpretation.rationale,
                toolCalls: calls,
                usage: { inputTokens, outputTokens },
                decision: { intent: interpretation.intent, constraints: interpretation.constraints, needsClarification: interpretation.intent === 'unclear', selectedTool: null },
            };
        }
        let toolResult;
        const toolArguments = Object.fromEntries(Object.entries(interpretation.toolArguments ?? {}).filter(([, value]) => value !== null && value !== undefined));
        if (interpretation.selectedTool === 'movie_search') {
            toolResult = await (0, tool_1.invokeTool)(cinema_1.movieSearchTool, toolArguments, toolContext);
            calls.push(cinema_1.movieSearchTool.name);
        }
        else {
            toolResult = await (0, tool_1.invokeTool)(cinema_1.showtimeSearchTool, toolArguments, toolContext);
            calls.push(cinema_1.showtimeSearchTool.name);
        }
        // Present the validated database payload directly. A second LLM call made local
        // Qwen exceed the request deadline and is unnecessary for these factual replies.
        const records = Array.isArray(toolResult) ? toolResult : [];
        let response;
        if (interpretation.selectedTool === 'movie_search') {
            response = records.length
                ? `Here are matching movies currently listed at JoJo Cinema:\n${records.slice(0, 5).map(movie => {
                    const details = [movie.language, Array.isArray(movie.genres) && movie.genres.length ? movie.genres.join(', ') : null]
                        .filter(Boolean).join('; ');
                    return `• ${movie.title}${details ? ` (${details})` : ''}`;
                }).join('\n')}`
                : 'I couldn’t find matching movies in the current cinema listings. Try another title, city, language, or genre.';
        }
        else {
            response = formatShowtimeRecords(records);
        }
        return {
            status: 'completed',
            response,
            rationale: 'The reply is formatted directly from the verified cinema database results.',
            toolCalls: calls,
            usage: { inputTokens, outputTokens },
            decision: { intent: interpretation.intent, constraints: interpretation.constraints, needsClarification: false, selectedTool: interpretation.selectedTool },
            groundingEvidence: Array.isArray(toolResult) ? toolResult : [toolResult],
        };
    }
}
exports.ConversationIntentAgent = ConversationIntentAgent;
function validateInterpretation(value) {
    return schemas_1.conversationInterpretationSchema.parse(value);
}
//# sourceMappingURL=agent.js.map