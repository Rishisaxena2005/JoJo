"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env"); // Validate env first
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = __importDefault(require("./config/database"));
const PORT = env_1.env.PORT;
async function startServer() {
    try {
        // Verify DB connection
        await database_1.default.$connect();
        logger_1.logger.info('✅ Database connected');
        const server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🎬 JoJo Cinema API running on port ${PORT}`);
            logger_1.logger.info(`   Environment: ${env_1.env.NODE_ENV}`);
            logger_1.logger.info(`   Demo mode: ${env_1.env.DEMO_MODE}`);
            logger_1.logger.info(`   API docs: http://localhost:${PORT}/api`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received — shutting down gracefully`);
            server.close(async () => {
                await database_1.default.$disconnect();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (err) {
        logger_1.logger.error('Failed to start server', { error: err });
        await database_1.default.$disconnect();
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map