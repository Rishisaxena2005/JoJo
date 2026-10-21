"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const errorHandler_1 = require("./errorHandler");
const api_1 = require("../types/api");
function validate(schema, target = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            throw new errorHandler_1.AppError(400, api_1.ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
                fields: result.error.flatten().fieldErrors,
            });
        }
        req[target] = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map