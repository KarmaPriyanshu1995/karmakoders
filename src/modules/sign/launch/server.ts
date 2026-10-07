import "server-only";

import { notFound } from "next/navigation";
import { isSignAppEnabled } from "@/platform/env/flags";
import { PlatformError } from "@/platform/errors";

/** Pages and layouts: 404 while the Sign app is disabled. */
export function requireSignAppEnabledPage(): void {
  if (!isSignAppEnabled()) notFound();
}

/** API route handlers: throws a 404 PlatformError (→ JSON via toHttpError) while disabled. */
export function requireSignAppEnabledApi(): void {
  if (!isSignAppEnabled()) {
    throw new PlatformError("not_found", "Not found");
  }
}
