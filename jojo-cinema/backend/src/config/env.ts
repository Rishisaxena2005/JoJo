import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEMO_MODE: z.string().default('true').transform(v => v === 'true'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  SEAT_LOCK_DURATION_SECONDS: z.string().default('300').transform(Number),
  BOOKING_EXPIRY_SECONDS: z.string().default('900').transform(Number),
  MAX_SEATS_PER_BOOKING: z.string().default('6').transform(Number),
  SESSION_SECRET: z.string().default('change-this-in-production'),
  WEBHOOK_SECRET: z.string().default('webhook-secret'),
  JOJO_BOOKING_API_BASE_URL: z.string().default('http://localhost:4000/api'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
