import "server-only";

import type { PlatformCustomer, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma, withDbRetry } from "@/platform/db";
import { PlatformError } from "@/platform/errors";
import {
  KK_SESSION_COOKIE,
  SESSION_TTL_MS,
} from "./constants";
import { generateSessionToken, hashSessionToken } from "./crypto";

export type CustomerSession = {
  sessionId: string;
  customer: Pick<PlatformCustomer, "id" | "email" | "name" | "status">;
};

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

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

/** Creates a session row storing only the token hash (never the raw cookie value). */
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

export async function setSessionCookie(rawToken: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  jar.set(KK_SESSION_COOKIE, rawToken, sessionCookieOptions(maxAge));
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(KK_SESSION_COOKIE, "", sessionCookieOptions(0));
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const rawToken = jar.get(KK_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await withDbRetry(() =>
    prisma.platformSession.findUnique({
      where: { tokenHash },
      include: {
        customer: {
          select: { id: true, email: true, name: true, status: true },
        },
      },
    })
  );

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  // Touch lastSeenAt without blocking the request path hard
  void prisma.platformSession
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => undefined);

  return { sessionId: session.id, customer: session.customer };
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    throw new PlatformError("unauthorized", "Sign in required");
  }
  return session;
}

export async function revokeCustomerSession(rawToken?: string | null): Promise<void> {
  const jar = await cookies();
  const token = rawToken ?? jar.get(KK_SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await withDbRetry(() =>
      prisma.platformSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    );
  }
  await clearSessionCookie();
}
