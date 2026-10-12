import "server-only";

import { cache } from "react";
import type { PlatformCustomer, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, withDbRetry } from "@/platform/db";
import { PlatformError } from "@/platform/errors";
import {
  SESSION_ABSOLUTE_MAX_MS,
  SESSION_REFRESH_INTERVAL_MS,
  SESSION_TTL_MS,
  sessionCookieName,
} from "./constants";
import { generateSessionToken, hashSessionToken } from "./crypto";
import { buildLoginHref } from "./redirect";

export type CurrentCustomer = Pick<PlatformCustomer, "id" | "email" | "name" | "status">;

export type CustomerSession = {
  sessionId: string;
  customer: CurrentCustomer;
};

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/** httpOnly, Secure in production, SameSite=Lax, Path=/, no Domain (required by `__Host-`). */
export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export type CreateSessionOptions = {
  /** Run inside this interactive transaction (no retry wrapper — the caller owns atomicity). */
  tx?: Prisma.TransactionClient;
  ip?: string | null;
  userAgent?: string | null;
};

/** Max stored user-agent length (headers are client-controlled). */
const USER_AGENT_MAX = 512;

/**
 * Creates a brand-new session (fresh 32-byte random token) and stores only its HMAC.
 * Called on every successful login, so a token is never reused (no session fixation).
 */
export async function createCustomerSession(
  customerId: string,
  options: CreateSessionOptions = {}
): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const { tx, ip, userAgent } = options;
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const data = {
    customerId,
    tokenHash,
    expiresAt,
    ip: ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX) : null,
  };

  if (tx) {
    await tx.platformSession.create({ data });
  } else {
    await withDbRetry(() => prisma.platformSession.create({ data }));
  }

  return { rawToken, expiresAt };
}

/**
 * Sets the session cookie for a newly created session. The cookie lives for the 90-day
 * absolute maximum; the server enforces the 30-day sliding idle window and the absolute cap
 * (expiresAt / createdAt in the DB), so the cookie never needs rewriting on activity.
 */
export async function setSessionCookie(rawToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(sessionCookieName(), rawToken, sessionCookieOptions(Math.floor(SESSION_ABSOLUTE_MAX_MS / 1000)));
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(sessionCookieName(), "", sessionCookieOptions(0));
}

/** New sliding expiry: now + 30 days, never beyond createdAt + 90 days. */
export function nextSessionExpiry(createdAt: Date, now: Date = new Date()): Date {
  return new Date(Math.min(now.getTime() + SESSION_TTL_MS, createdAt.getTime() + SESSION_ABSOLUTE_MAX_MS));
}

/** True when lastSeenAt is old enough that the sliding window should be extended. */
export function shouldRefreshSession(lastSeenAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_REFRESH_INTERVAL_MS;
}

async function loadCurrentSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const rawToken = jar.get(sessionCookieName())?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await withDbRetry(() =>
    prisma.platformSession.findUnique({
      where: { tokenHash },
      include: {
        customer: { select: { id: true, email: true, name: true, status: true } },
      },
    })
  );

  const now = new Date();
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= now.getTime() ||
    now.getTime() - session.createdAt.getTime() >= SESSION_ABSOLUTE_MAX_MS ||
    session.customer.status !== "ACTIVE"
  ) {
    return null;
  }

  // Sliding expiry, written at most once per hour. Conditional on lastSeenAt so concurrent
  // requests don't all write; a failed refresh never blocks the request.
  if (shouldRefreshSession(session.lastSeenAt, now)) {
    await prisma.platformSession
      .updateMany({
        where: { id: session.id, lastSeenAt: session.lastSeenAt, revokedAt: null },
        data: { lastSeenAt: now, expiresAt: nextSessionExpiry(session.createdAt, now) },
      })
      .catch(() => undefined);
  }

  return { sessionId: session.id, customer: session.customer };
}

/**
 * The signed-in customer for this request, or null. Validates cookie, token hash, revocation,
 * idle expiry, the 90-day absolute limit and customer status ACTIVE. Cached per request.
 */
export const getCurrentSession = cache(loadCurrentSession);

export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  return (await getCurrentSession())?.customer ?? null;
}

/**
 * Requires a signed-in customer.
 * - Pages: `requireCustomer({ redirectToLoginFrom: "/tools/sign/dashboard" })` redirects to
 *   /tools/sign/login?next=<path>.
 * - Route handlers / Server Actions: `requireCustomer()` throws a 401 PlatformError
 *   (→ JSON via toHttpError).
 */
export async function requireCustomer(options: { redirectToLoginFrom?: string } = {}): Promise<CustomerSession> {
  const session = await getCurrentSession();
  if (session) return session;
  if (options.redirectToLoginFrom) redirect(buildLoginHref(options.redirectToLoginFrom));
  throw new PlatformError("unauthorized", "Sign in required");
}

/** Logout: revokes the current session (by cookie) and clears the cookie. */
export async function revokeSession(rawToken?: string | null): Promise<void> {
  const jar = await cookies();
  const token = rawToken ?? jar.get(sessionCookieName())?.value;
  if (token) {
    await withDbRetry(() =>
      prisma.platformSession.updateMany({
        where: { tokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
    );
  }
  await clearSessionCookie();
}

/** Logout everywhere: revokes every active session of the customer. Returns how many. */
export async function revokeAllSessions(customerId: string): Promise<number> {
  const { count } = await withDbRetry(() =>
    prisma.platformSession.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  );
  return count;
}
