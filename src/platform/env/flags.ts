import { z } from "zod";

/**
 * Server-side feature flags. Kept separate from ./server.ts (which imports "server-only")
 * so src/proxy.ts can use them too. Never import this from client components: pass the
 * resolved value down as a prop instead.
 *
 * Read on every call (no memoisation) so tests can toggle flags. Validation happens at
 * call time, never at import or build time.
 */

const booleanFlag = z
  .enum(["true", "false"], { error: 'must be "true" or "false"' })
  .optional()
  .transform((value) => value === "true");

const signFlagsSchema = z.object({
  /** Launch switch for the Sign app (login, dashboard, compose, signer links, auth APIs). */
  SIGN_APP_ENABLED: booleanFlag,
});

export type SignFlags = z.infer<typeof signFlagsSchema>;

/** Any env-like record (process.env or a test fixture). */
export type EnvSource = Readonly<Record<string, string | undefined>>;

export function getSignFlags(env: EnvSource = process.env): SignFlags {
  const raw = env.SIGN_APP_ENABLED?.trim();
  const result = signFlagsSchema.safeParse({ SIGN_APP_ENABLED: raw === "" ? undefined : raw });
  if (!result.success) {
    throw new Error(
      `getSignFlags: invalid environment variable(s): ${[
        ...new Set(result.error.issues.map((i) => String(i.path[0]))),
      ].join(", ")} (expected "true" or "false")`
    );
  }
  return result.data;
}

/** True only when SIGN_APP_ENABLED="true". Defaults to false (pre-launch). */
export function isSignAppEnabled(env: EnvSource = process.env): boolean {
  return getSignFlags(env).SIGN_APP_ENABLED;
}
