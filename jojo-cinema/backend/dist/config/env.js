"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('4000').transform(Number),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DEMO_MODE: zod_1.z.string().default('true').transform(v => v === 'true'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173,http://localhost:3000'),
    SEAT_LOCK_DURATION_SECONDS: zod_1.z.string().default('300').transform(Number),
    BOOKING_EXPIRY_SECONDS: zod_1.z.string().default('900').transform(Number),
    MAX_SEATS_PER_BOOKING: zod_1.z.string().default('6').transform(Number),
    SESSION_SECRET: zod_1.z.string().default('change-this-in-production'),
    WEBHOOK_SECRET: zod_1.z.string().default('webhook-secret'),
    JOJO_BOOKING_API_BASE_URL: zod_1.z.string().default('http://localhost:4000/api'),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    AGENT_PROVIDER: zod_1.z.enum(['openai', 'ollama']).default('openai'),
    OLLAMA_BASE_URL: zod_1.z.string().url().default('http://127.0.0.1:11434/v1'),
    AGENT_MODEL: zod_1.z.string().default('gpt-6-luna'),
    AGENT_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(20000),
    AGENT_MAX_RETRIES: zod_1.z.coerce.number().int().nonnegative().default(1),
    AGENT_MAX_OUTPUT_TOKENS: zod_1.z.coerce.number().int().positive().default(1000),
    AGENT_MAX_COST_USD: zod_1.z.coerce.number().positive().default(0.05),
    AGENT_EVAL_MAX_COST_USD: zod_1.z.coerce.number().positive().default(0.5),
    AGENT_INPUT_COST_PER_1M_USD: zod_1.z.coerce.number().nonnegative().default(0.1),
    AGENT_OUTPUT_COST_PER_1M_USD: zod_1.z.coerce.number().nonnegative().default(0.5),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map