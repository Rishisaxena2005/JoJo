"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMovies = getMovies;
exports.getMovieById = getMovieById;
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const api_1 = require("../types/api");
async function getMovies(filters) {
    const { city, search, language, genre, status, page, limit } = filters;
    const skip = (page - 1) * limit;
    // Build the where clause
    const where = {};
    if (status) {
        where.status = status;
    }
    if (search) {
        where.title = { contains: search, mode: 'insensitive' };
    }
    if (language) {
        where.language = { equals: language, mode: 'insensitive' };
    }
    if (genre) {
        where.genres = { has: genre };
    }
    // If city filter is applied, only return movies with shows in that city
    if (city) {
        const cityRecord = await database_1.default.city.findFirst({
            where: { name: { equals: city, mode: 'insensitive' } },
        });
        if (!cityRecord) {
            return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
        }
        where.shows = {
            some: {
                status: 'SCHEDULED',
                startTime: { gte: new Date() },
                screen: {
                    theatre: { cityId: cityRecord.id },
                },
            },
        };
    }
    const [total, movies] = await Promise.all([
        database_1.default.movie.count({ where }),
        database_1.default.movie.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ status: 'asc' }, { releaseDate: 'desc' }],
            select: {
                id: true,
                title: true,
                language: true,
                genres: true,
                durationMinutes: true,
                certification: true,
                posterUrl: true,
                backdropUrl: true,
                releaseDate: true,
                status: true,
                director: true,
                synopsis: true,
                _count: { select: { shows: true } },
            },
        }),
    ]);
    return {
        items: movies,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
async function getMovieById(movieId) {
    const movie = await database_1.default.movie.findUnique({
        where: { id: movieId },
        include: {
            _count: { select: { shows: true } },
        },
    });
    if (!movie) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.NOT_FOUND, `Movie not found: ${movieId}`);
    }
    return movie;
}
//# sourceMappingURL=movieService.js.map