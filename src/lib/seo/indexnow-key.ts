import { createHash } from "crypto";

export function resolveIndexNowKey(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.INDEXNOW_KEY?.trim();
  if (configured && /^[A-Za-z0-9-]{8,128}$/.test(configured)) return configured;
  const secret = env.NEXTAUTH_SECRET || "karmakoders-indexnow";
  return createHash("sha256").update(`indexnow:${secret}`).digest("hex");
}
