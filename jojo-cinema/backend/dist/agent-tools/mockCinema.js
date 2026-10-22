"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockShowtimeSearchTool = exports.mockMovieSearchTool = void 0;
// Static fixtures retained for offline runtime unit tests. The production conversation
// agent uses cinema.ts, which queries the database-backed cinema services.
const zod_1 = require("zod");
const searchSchema = zod_1.z.object({ query: zod_1.z.string().max(80).optional(), city: zod_1.z.string().max(80).optional() });
const showSchema = zod_1.z.object({ movieTitle: zod_1.z.string().min(1).max(100), city: zod_1.z.string().max(80).optional() });
const mockMovies = [
    { id: 'mock-movie-1', title: 'The Moonlit Garden', genres: ['Adventure', 'Family'], language: 'Hindi', certification: 'U', city: 'Pune' },
    { id: 'mock-movie-2', title: 'Signal at Dawn', genres: ['Drama'], language: 'English', certification: 'U/A', city: 'Pune' },
];
exports.mockMovieSearchTool = {
    name: 'mock_movie_search', description: 'Search sample movie records for offline tests.', schema: searchSchema,
    sanitizeArguments: args => ({ query: args.query ?? '', city: args.city ?? 'any' }),
    summarizeResult: result => `Returned ${result.length} fixture movies`,
    async execute(args, context) {
        if (context.signal.aborted)
            throw new Error('Tool execution aborted');
        return mockMovies.filter(movie => (!args.query || movie.title.toLowerCase().includes(args.query.toLowerCase())) && (!args.city || movie.city.toLowerCase() === args.city.toLowerCase()));
    },
};
exports.mockShowtimeSearchTool = {
    name: 'mock_showtime_search', description: 'Return a fixed sample showtime record for offline tests.', schema: showSchema,
    sanitizeArguments: args => ({ movieTitle: args.movieTitle, city: args.city ?? 'any' }),
    summarizeResult: result => `Returned ${result.length} fixture showtimes`,
    async execute(args, context) {
        if (context.signal.aborted)
            throw new Error('Tool execution aborted');
        const movie = mockMovies.find(item => item.title.toLowerCase() === args.movieTitle.toLowerCase() && (!args.city || item.city.toLowerCase() === args.city.toLowerCase()));
        return movie ? [{ movieTitle: movie.title, theatre: 'Sample Cinema (mock)', startTime: '2030-01-01T18:00:00+05:30', availableSeats: 42, priceInr: 180 }] : [];
    },
};
//# sourceMappingURL=mockCinema.js.map