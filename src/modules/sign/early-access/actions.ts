"use server";

import { headers } from "next/headers";
import { isPlatformError } from "@/platform/errors";
import { logEvent } from "@/platform/logger";
import { clientIpFromHeaders, consumePlatformRateLimit } from "@/platform/rate-limit";
import { assertSameOrigin } from "@/platform/security/same-origin";
import {
  EARLY_ACCESS_ERROR_MESSAGE,
  EARLY_ACCESS_HONEYPOT_FIELD,
  EARLY_ACCESS_INVALID_EMAIL_MESSAGE,
  EARLY_ACCESS_INVALID_MESSAGE,
  EARLY_ACCESS_RATE_LIMIT_MESSAGE,
  EARLY_ACCESS_SUCCESS_MESSAGE,
  type EarlyAccessFormState,
} from "./schema";
import { submitEarlyAccess } from "./service";

/** 5 submissions per hour per IP. (Not exported: "use server" files may only export async functions.) */
const EARLY_ACCESS_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 } as const;

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Early-access signup (useActionState). New, duplicate and honeypot submissions all return
 * the same success message, so the response never reveals whether an email is on the list
 * or that a bot was detected.
 */
export async function joinEarlyAccess(
  _prev: EarlyAccessFormState,
  formData: FormData
): Promise<EarlyAccessFormState> {
  try {
    const requestHeaders = await headers();
    assertSameOrigin(requestHeaders);

    const ip = clientIpFromHeaders(requestHeaders);
    const limit = await consumePlatformRateLimit({ key: `early-access:ip:${ip}`, ...EARLY_ACCESS_RATE_LIMIT });
    if (!limit.allowed) {
      return { status: "error", message: EARLY_ACCESS_RATE_LIMIT_MESSAGE };
    }

    const result = await submitEarlyAccess({
      email: field(formData, "email") ?? "",
      company: field(formData, "company"),
      role: field(formData, "role"),
      source: field(formData, "source"),
      [EARLY_ACCESS_HONEYPOT_FIELD]: field(formData, EARLY_ACCESS_HONEYPOT_FIELD),
    });

    if (result.ok || result.reason === "honeypot") {
      return { status: "success", message: EARLY_ACCESS_SUCCESS_MESSAGE };
    }
    if (result.reason === "invalid_email") {
      return { status: "error", message: EARLY_ACCESS_INVALID_EMAIL_MESSAGE, field: "email" };
    }
    return { status: "error", message: EARLY_ACCESS_INVALID_MESSAGE };
  } catch (error) {
    if (isPlatformError(error) && error.code === "forbidden") {
      return { status: "error", message: EARLY_ACCESS_ERROR_MESSAGE };
    }
    logEvent("error", "early_access_failed", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : undefined,
    });
    return { status: "error", message: EARLY_ACCESS_ERROR_MESSAGE };
  }
}
