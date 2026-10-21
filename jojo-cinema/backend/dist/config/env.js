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
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map