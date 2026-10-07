import "server-only";

import { PlatformError } from "@/platform/errors";

type HeaderReader = Pick<Headers, "get">;

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF defence for Server Actions and mutating routes: the browser-supplied Origin must
 * match the host serving the request (x-forwarded-host on Vercel, else Host) or the
 * configured app origin (APP_URL / NEXT_PUBLIC_APP_URL). A missing Origin is rejected.
 */
export function assertSameOrigin(
  headers: HeaderReader,
  env: Readonly<Record<string, string | undefined>> = process.env
): void {
  const origin = hostOf(headers.get("origin"));
  if (!origin) {
    throw new PlatformError("forbidden", "Invalid request origin");
  }

  const requestHost = (headers.get("x-forwarded-host") ?? headers.get("host"))?.split(",")[0]?.trim().toLowerCase();
  const allowed = new Set(
    [requestHost, hostOf(env.APP_URL), hostOf(env.NEXT_PUBLIC_APP_URL)].filter(
      (h): h is string => Boolean(h)
    )
  );

  if (!allowed.has(origin)) {
    throw new PlatformError("forbidden", "Invalid request origin");
  }
}
