"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const seatLockService_1 = require("../services/seatLockService");
const api_1 = require("../types/api");
const router = (0, express_1.Router)();
// POST /api/seat-locks
router.post('/', (0, validate_1.validate)(schemas_1.seatLockSchema), async (req, res, next) => {
    try {
        const result = await (0, seatLockService_1.lockSeats)(req.body);
        res.status(201).json((0, api_1.success)(result));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/seat-locks/:lockId
router.get('/:lockId', (0, validate_1.validate)(schemas_1.releaseLockSchema, 'params'), async (req, res, next) => {
    try {
        const lock = await (0, seatLockService_1.getLockById)(req.params.lockId);
        res.json((0, api_1.success)(lock));
    }
    catch (e) {
        next(e);
    }
});
// POST /api/seat-locks/:lockId/release
router.post('/:lockId/release', (0, validate_1.validate)(schemas_1.releaseLockSchema, 'params'), (0, validate_1.validate)(schemas_1.releaseLockBodySchema), async (req, res, next) => {
    try {
        const result = await (0, seatLockService_1.releaseLock)(req.params.lockId, req.body.sessionId);
        res.json((0, api_1.success)(result));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=seatLocks.js.map