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
    AGENT_PROVIDER: "openai" | "ollama";
    OLLAMA_BASE_URL: string;
    AGENT_MODEL: string;
    AGENT_TIMEOUT_MS: number;
    AGENT_MAX_RETRIES: number;
    AGENT_MAX_OUTPUT_TOKENS: number;
    AGENT_MAX_COST_USD: number;
    AGENT_EVAL_MAX_COST_USD: number;
    AGENT_INPUT_COST_PER_1M_USD: number;
    AGENT_OUTPUT_COST_PER_1M_USD: number;
    OPENAI_API_KEY?: string | undefined;
};
export type Env = typeof env;
//# sourceMappingURL=env.d.ts.map