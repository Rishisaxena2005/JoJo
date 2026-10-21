"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const database_1 = __importDefault(require("../config/database"));
const api_1 = require("../types/api");
const router = (0, express_1.Router)();
// GET /api/tickets/:ticketReference/verify
router.get('/:ticketReference/verify', (0, validate_1.validate)(schemas_1.ticketRefSchema, 'params'), async (req, res, next) => {
    try {
        const ticket = await database_1.default.ticket.findUnique({
            where: { ticketReference: req.params.ticketReference },
            include: {
                booking: {
                    select: {
                        status: true,
                        show: {
                            select: {
                                startTime: true,
                                movie: { select: { title: true } },
                                screen: {
                                    select: {
                                        name: true,
                                        theatre: { select: { name: true, city: { select: { name: true } } } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!ticket) {
            res.status(404).json((0, api_1.failure)('TICKET_NOT_FOUND', 'Ticket not found'));
            return;
        }
        if (ticket.booking.status !== 'CONFIRMED') {
            res.status(409).json((0, api_1.failure)('TICKET_INVALID', 'Ticket is not valid'));
            return;
        }
        res.json((0, api_1.success)({
            valid: true,
            ticketReference: ticket.ticketReference,
            movie: ticket.booking.show.movie.title,
            theatre: ticket.booking.show.screen.theatre.name,
            city: ticket.booking.show.screen.theatre.city.name,
            showTime: ticket.booking.show.startTime,
            issuedAt: ticket.issuedAt,
        }));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=tickets.js.map