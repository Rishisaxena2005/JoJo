export declare const env: {
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    DEMO_MODE: boolean;
    DATABASE_URL: string;
    CORS_ORIGINS: string;
    SEAT_LOCK_DURATION_SECONDS: number;
    BOOKING_EXPIRY_SECONDS: number;
    MAX_SEATS_PER_BOOKING: number;
    SESSION_SECRET: string;
    WEBHOOK_SECRET: string;
    JOJO_BOOKING_API_BASE_URL: string;
};
export type Env = typeof env;
//# sourceMappingURL=env.d.ts.map