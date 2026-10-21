"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const api_1 = require("../types/api");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    res.json((0, api_1.success)({ status: 'ok', timestamp: new Date().toISOString() }));
});
router.get('/ready', async (_req, res) => {
    try {
        await database_1.default.$queryRaw `SELECT 1`;
        res.json((0, api_1.success)({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() }));
    }
    catch {
        res.status(503).json({ success: false, data: null, error: { code: 'DB_UNAVAILABLE', message: 'Database not ready' } });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map