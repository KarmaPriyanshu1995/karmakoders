import "server-only";

import { z } from "zod";

function missingMessage(prefix: string, issues: z.ZodIssue[]): string {
  const keys = [...new Set(issues.map((i) => String(i.path[0] ?? "unknown")))];
  return `${prefix}: missing or invalid environment variable(s): ${keys.join(", ")}`;
}

function parseOnDemand<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(missingMessage(label, result.error.issues));
  }
  return result.data;
}

const nonEmpty = z.string().min(1);

const paddleServerSchema = z.object({
  PADDLE_API_KEY: nonEmpty,
  PADDLE_WEBHOOK_SECRET: nonEmpty,
  PADDLE_PRICE_CREDITS_10: nonEmpty,
  PADDLE_PRICE_CREDITS_30: nonEmpty,
  PADDLE_PRICE_SIGN_PRO_MONTHLY: nonEmpty,
  PADDLE_PRICE_SIGN_PRO_YEARLY: nonEmpty,
  PADDLE_PRICE_ALL_ACCESS_MONTHLY: nonEmpty,
  PADDLE_PRICE_ALL_ACCESS_YEARLY: nonEmpty,
});

const storageSchema = z.object({
  FILE_ENCRYPTION_KEY: nonEmpty,
  R2_ACCOUNT_ID: nonEmpty,
  R2_ACCESS_KEY_ID: nonEmpty,
  R2_SECRET_ACCESS_KEY: nonEmpty,
  R2_BUCKET: nonEmpty,
  R2_ENDPOINT: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

const emailSchema = z.object({
  RESEND_API_KEY: nonEmpty,
  EMAIL_FROM: nonEmpty,
});

const authSchema = z.object({
  SESSION_SECRET: nonEmpty,
  TOKEN_PEPPER: nonEmpty,
});

const appServerSchema = z.object({
  APP_URL: z.string().url(),
  DATABASE_URL: nonEmpty,
  ADMIN_EMAILS: z.string().optional().default(""),
});

const redisSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
});

const jobsSchema = z.object({
  INNGEST_EVENT_KEY: nonEmpty,
  INNGEST_SIGNING_KEY: nonEmpty,
});

const pdfSchema = z.object({
  PDF_SERVICE_URL: z.string().url(),
  PDF_SERVICE_SECRET: nonEmpty,
});

const observabilityServerSchema = z.object({
  SENTRY_DSN: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

type Cache<T> = { value?: T };

const caches: {
  paddle?: Cache<z.infer<typeof paddleServerSchema>>;
  storage?: Cache<z.infer<typeof storageSchema>>;
  email?: Cache<z.infer<typeof emailSchema>>;
  auth?: Cache<z.infer<typeof authSchema>>;
  app?: Cache<z.infer<typeof appServerSchema>>;
  redis?: Cache<z.infer<typeof redisSchema>>;
  jobs?: Cache<z.infer<typeof jobsSchema>>;
  pdf?: Cache<z.infer<typeof pdfSchema>>;
  observability?: Cache<z.infer<typeof observabilityServerSchema>>;
} = {};

function memoize<T>(bucket: keyof typeof caches, compute: () => T): T {
  const slot = (caches[bucket] ??= {}) as Cache<T>;
  if (slot.value === undefined) slot.value = compute();
  return slot.value;
}

/** Paddle server API + price IDs. Call only when billing runs. */
export function getPaddleServerEnv() {
  return memoize("paddle", () =>
    parseOnDemand(
      paddleServerSchema,
      {
        PADDLE_API_KEY: process.env.PADDLE_API_KEY,
        PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET,
        PADDLE_PRICE_CREDITS_10: process.env.PADDLE_PRICE_CREDITS_10,
        PADDLE_PRICE_CREDITS_30: process.env.PADDLE_PRICE_CREDITS_30,
        PADDLE_PRICE_SIGN_PRO_MONTHLY: process.env.PADDLE_PRICE_SIGN_PRO_MONTHLY,
        PADDLE_PRICE_SIGN_PRO_YEARLY: process.env.PADDLE_PRICE_SIGN_PRO_YEARLY,
        PADDLE_PRICE_ALL_ACCESS_MONTHLY: process.env.PADDLE_PRICE_ALL_ACCESS_MONTHLY,
        PADDLE_PRICE_ALL_ACCESS_YEARLY: process.env.PADDLE_PRICE_ALL_ACCESS_YEARLY,
      },
      "getPaddleServerEnv"
    )
  );
}

/** R2 + file encryption. */
export function getStorageEnv() {
  return memoize("storage", () =>
    parseOnDemand(
      storageSchema,
      {
        FILE_ENCRYPTION_KEY: process.env.FILE_ENCRYPTION_KEY,
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET: process.env.R2_BUCKET,
        R2_ENDPOINT: process.env.R2_ENDPOINT,
      },
      "getStorageEnv"
    )
  );
}

/** Resend transactional email. */
export function getEmailEnv() {
  return memoize("email", () =>
    parseOnDemand(
      emailSchema,
      {
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
      },
      "getEmailEnv"
    )
  );
}

/** Customer session + signer token pepper. */
export function getAuthEnv() {
  return memoize("auth", () =>
    parseOnDemand(
      authSchema,
      {
        SESSION_SECRET: process.env.SESSION_SECRET,
        TOKEN_PEPPER: process.env.TOKEN_PEPPER,
      },
      "getAuthEnv"
    )
  );
}

/** App URL, database, admin allow-list. */
export function getAppServerEnv() {
  return memoize("app", () =>
    parseOnDemand(
      appServerSchema,
      {
        APP_URL: process.env.APP_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
      },
      "getAppServerEnv"
    )
  );
}

/** Upstash Redis REST. */
export function getRedisEnv() {
  return memoize("redis", () =>
    parseOnDemand(
      redisSchema,
      {
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      },
      "getRedisEnv"
    )
  );
}

/** Inngest keys. */
export function getJobsEnv() {
  return memoize("jobs", () =>
    parseOnDemand(
      jobsSchema,
      {
        INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
        INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
      },
      "getJobsEnv"
    )
  );
}

/** External PDF render service. */
export function getPdfServiceEnv() {
  return memoize("pdf", () =>
    parseOnDemand(
      pdfSchema,
      {
        PDF_SERVICE_URL: process.env.PDF_SERVICE_URL,
        PDF_SERVICE_SECRET: process.env.PDF_SERVICE_SECRET,
      },
      "getPdfServiceEnv"
    )
  );
}

/** Optional Sentry DSN. */
export function getObservabilityServerEnv() {
  return memoize("observability", () =>
    parseOnDemand(
      observabilityServerSchema,
      { SENTRY_DSN: process.env.SENTRY_DSN },
      "getObservabilityServerEnv"
    )
  );
}
