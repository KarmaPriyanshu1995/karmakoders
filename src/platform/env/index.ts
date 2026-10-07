/**
 * Client-safe env getters.
 * Server getters (Paddle API, R2, Resend, etc.): import from `@/platform/env/server`.
 */
export { getPaddleClientEnv, getAppClientEnv, getPosthogClientEnv } from "./client";
