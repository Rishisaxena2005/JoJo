"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const showService_1 = require("../services/showService");
const api_1 = require("../types/api");
const router = (0, express_1.Router)();
// GET /api/shows
router.get('/', (0, validate_1.validate)(schemas_1.showQuerySchema, 'query'), async (req, res, next) => {
    try {
        const shows = await (0, showService_1.getShows)(req.query);
        res.json((0, api_1.success)(shows));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/shows/:showId
router.get('/:showId', (0, validate_1.validate)(schemas_1.showIdSchema, 'params'), async (req, res, next) => {
    try {
        const show = await (0, showService_1.getShowById)(req.params.showId);
        res.json((0, api_1.success)(show));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/shows/:showId/seats
router.get('/:showId/seats', (0, validate_1.validate)(schemas_1.showIdSchema, 'params'), async (req, res, next) => {
    try {
        const seats = await (0, showService_1.getShowSeats)(req.params.showId);
        res.json((0, api_1.success)(seats));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=shows.js.map