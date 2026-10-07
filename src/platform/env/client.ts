import { z } from "zod";

function missingMessage(prefix: string, issues: z.ZodIssue[]): string {
  const keys = [...new Set(issues.map((i) => String(i.path[0] ?? "unknown")))];
  return `${prefix}: missing or invalid environment variable(s): ${keys.join(", ")}`;
}

const paddleClientSchema = z.object({
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().min(1),
  NEXT_PUBLIC_PADDLE_ENV: z.enum(["sandbox", "production"]),
});

const appClientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const posthogSchema = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
});

type Cache<T> = { value?: T };
const caches: {
  paddle?: Cache<z.infer<typeof paddleClientSchema>>;
  app?: Cache<z.infer<typeof appClientSchema>>;
  posthog?: Cache<z.infer<typeof posthogSchema>>;
} = {};

function memoize<T>(bucket: keyof typeof caches, compute: () => T): T {
  const slot = (caches[bucket] ??= {}) as Cache<T>;
  if (slot.value === undefined) slot.value = compute();
  return slot.value;
}

function readPublic(name: string): string | undefined {
  // Next inlines NEXT_PUBLIC_* at build; access via process.env is correct.
  return process.env[name];
}

/** Browser Paddle.js token + env. Call when opening checkout. */
export function getPaddleClientEnv() {
  return memoize("paddle", () => {
    const result = paddleClientSchema.safeParse({
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: readPublic("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"),
      NEXT_PUBLIC_PADDLE_ENV: readPublic("NEXT_PUBLIC_PADDLE_ENV"),
    });
    if (!result.success) {
      throw new Error(missingMessage("getPaddleClientEnv", result.error.issues));
    }
    return result.data;
  });
}

/** Public app origin for client links. */
export function getAppClientEnv() {
  return memoize("app", () => {
    const result = appClientSchema.safeParse({
      NEXT_PUBLIC_APP_URL: readPublic("NEXT_PUBLIC_APP_URL"),
    });
    if (!result.success) {
      throw new Error(missingMessage("getAppClientEnv", result.error.issues));
    }
    return result.data;
  });
}

/** PostHog browser analytics (optional until product launch). */
export function getPosthogClientEnv() {
  return memoize("posthog", () => {
    const result = posthogSchema.safeParse({
      NEXT_PUBLIC_POSTHOG_KEY: readPublic("NEXT_PUBLIC_POSTHOG_KEY"),
      NEXT_PUBLIC_POSTHOG_HOST: readPublic("NEXT_PUBLIC_POSTHOG_HOST"),
    });
    if (!result.success) {
      throw new Error(missingMessage("getPosthogClientEnv", result.error.issues));
    }
    return result.data;
  });
}
