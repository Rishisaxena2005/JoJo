"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const movieService_1 = require("../services/movieService");
const api_1 = require("../types/api");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// GET /api/movies
router.get('/', (0, validate_1.validate)(schemas_1.movieQuerySchema, 'query'), async (req, res, next) => {
    try {
        const result = await (0, movieService_1.getMovies)(req.query);
        res.json((0, api_1.success)(result));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/movies/cities — list all cities
router.get('/cities', async (_req, res, next) => {
    try {
        const cities = await database_1.default.city.findMany({ orderBy: { name: 'asc' } });
        res.json((0, api_1.success)(cities));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/movies/:movieId
router.get('/:movieId', (0, validate_1.validate)(schemas_1.movieIdSchema, 'params'), async (req, res, next) => {
    try {
        const movie = await (0, movieService_1.getMovieById)(req.params.movieId);
        res.json((0, api_1.success)(movie));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=movies.js.map