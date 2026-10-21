"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const api_1 = require("../types/api");
const logger_1 = require("../config/logger");
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, _next) {
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json((0, api_1.failure)(api_1.ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
            fields: err.flatten().fieldErrors,
        }));
        return;
    }
    // Known application errors
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger_1.logger.error('Application error', { code: err.code, message: err.message, stack: err.stack });
        }
        res.status(err.statusCode).json((0, api_1.failure)(err.code, err.message, err.details));
        return;
    }
    // Prisma unique constraint violations
    if (err.code === 'P2002') {
        res.status(409).json((0, api_1.failure)(api_1.ErrorCodes.CONFLICT, 'A resource with those details already exists'));
        return;
    }
    // Unknown errors — never leak internals
    logger_1.logger.error('Unhandled error', { message: err.message, stack: err.stack });
    res.status(500).json((0, api_1.failure)(api_1.ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred'));
}
function notFoundHandler(req, res) {
    res.status(404).json((0, api_1.failure)(api_1.ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`));
}
//# sourceMappingURL=errorHandler.js.map