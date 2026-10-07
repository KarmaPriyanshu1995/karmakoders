import "server-only";

import type { z } from "zod";
import { PlatformError } from "@/platform/errors";

/**
 * Reads a JSON body and validates it with `schema`.
 * Malformed JSON or schema failure → PlatformError("bad_request", safeMessage).
 * The message never echoes user input.
 */
export async function parseJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S,
  safeMessage: string
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new PlatformError("bad_request", safeMessage);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new PlatformError("bad_request", safeMessage);
  }
  return result.data;
}
