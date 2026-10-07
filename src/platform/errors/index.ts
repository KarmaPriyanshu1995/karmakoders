import "server-only";

import { NextResponse } from "next/server";
import { logEvent } from "@/platform/logger";

export type PlatformErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "conflict"
  | "internal";

const STATUS_BY_CODE: Record<PlatformErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  conflict: 409,
  internal: 500,
};

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly status: number;

  constructor(code: PlatformErrorCode, message: string, status?: number) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.status = status ?? STATUS_BY_CODE[code];
  }
}

export function isPlatformError(error: unknown): error is PlatformError {
  return error instanceof PlatformError;
}

/**
 * Maps any thrown value to a JSON response. PlatformError keeps its status and safe
 * message; anything else becomes a generic 500 and is logged server-side (name and
 * message only — never request bodies).
 */
export function toHttpError(error: unknown): NextResponse<{ error: string; code: string }> {
  if (isPlatformError(error)) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  logEvent("error", "unhandled_error", {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : undefined,
  });
  return NextResponse.json({ error: "Internal server error", code: "internal" }, { status: 500 });
}
