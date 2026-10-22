"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showtimeSearchTool = exports.movieSearchTool = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const movieService_1 = require("../services/movieService");
const showService_1 = require("../services/showService");
const movieSchema = zod_1.z.object({
    query: zod_1.z.string().max(80).optional(),
    city: zod_1.z.string().max(80).optional(),
    language: zod_1.z.string().max(50).optional(),
    genre: zod_1.z.string().max(50).optional(),
});
const showSchema = zod_1.z.object({
    movieTitle: zod_1.z.string().min(1).max(100),
    city: zod_1.z.string().max(80).optional(),
    date: zod_1.z.string().max(40).optional(),
});
function resolveDate(date) {
    if (!date)
        return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date))
        return date;
    const normalized = date.toLowerCase();
    if (normalized !== 'today' && normalized !== 'tonight' && normalized !== 'tomorrow')
        return undefined;
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (type) => parts.find(item => item.type === type)?.value ?? '';
    const day = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00+05:30`);
    if (normalized === 'tomorrow')
        day.setUTCDate(day.getUTCDate() + 1);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(day);
}
exports.movieSearchTool = {
    name: 'movie_search',
    description: 'Search the cinema database for movies, optionally filtering by title, city, language, and genre.',
    schema: movieSchema,
    sanitizeArguments: args => ({ query: args.query ?? '', city: args.city ?? 'any' }),
    summarizeResult: result => `Returned ${result.length} movies from the cinema database`,
    async execute(args, context) {
        if (context.signal.aborted)
            throw new Error('Tool execution aborted');
        const result = await (0, movieService_1.getMovies)({
            search: args.query, city: args.city, language: args.language, genre: args.genre,
            status: client_1.MovieStatus.NOW_SHOWING, page: 1, limit: 20,
        });
        return result.items;
    },
};
exports.showtimeSearchTool = {
    name: 'showtime_search',
    description: 'Search current scheduled showtimes, availability, and ticket price ranges in the cinema database.',
    schema: showSchema,
    sanitizeArguments: args => ({ movieTitle: args.movieTitle, city: args.city ?? 'any', date: args.date ?? 'future' }),
    summarizeResult: result => `Returned ${result.length} showtimes from the cinema database`,
    async execute(args, context) {
        if (context.signal.aborted)
            throw new Error('Tool execution aborted');
        // Resolve the title against the same catalogue first so the show query is exact.
        const movies = await (0, movieService_1.getMovies)({ search: args.movieTitle, city: args.city, status: client_1.MovieStatus.NOW_SHOWING, page: 1, limit: 20 });
        const matching = movies.items.filter(movie => movie.title.toLocaleLowerCase() === args.movieTitle.toLocaleLowerCase());
        if (matching.length !== 1)
            return [];
        return (0, showService_1.getShows)({ movieId: matching[0].id, city: args.city, date: resolveDate(args.date) });
    },
};
//# sourceMappingURL=cinema.js.map