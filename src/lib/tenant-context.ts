import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@prisma/client";
import { TenantAccessError } from "@/lib/errors";
import type { PermissionOverrides } from "@/lib/permissions";

export { TenantAccessError };

const ACTIVE_TENANT_COOKIE = "active_tenant_id";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
}

/** Session lookup, deduped per request via React `cache()`. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    isSuperAdmin: session.user.isSuperAdmin ?? false,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new TenantAccessError("Authentication required");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new TenantAccessError("Super admin access required");
  return user;
}

async function getActiveTenantCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

/**
 * Records which tenant the current browser session wants to act in.
 * This is only ever a *hint*: requireTenantContext() re-verifies it against
 * real Membership rows (or, for SUPER_ADMIN, real Tenant existence) on every
 * call, so a tampered cookie can never grant access to someone else's tenant.
 */
export async function setActiveTenantCookie(tenantId: string) {
  const store = await cookies();
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export interface TenantContext {
  user: CurrentUser;
  tenantId: string;
  role: MembershipRole;
  permissionOverrides: PermissionOverrides | null;
  tenant: { id: string; name: string; slug: string; status: string };
}

/**
 * The authoritative "who is this request acting as, in which tenant" resolver.
 * Every tenant-scoped server action / route handler should call this first
 * and use the returned tenantId for every query -- never a tenantId read
 * directly off the client request.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireUser();
  const cookieTenantId = await getActiveTenantCookie();

  if (user.isSuperAdmin) {
    if (cookieTenantId) {
      const cookieTenant = await prisma.tenant.findUnique({ where: { id: cookieTenantId } });
      if (cookieTenant?.status === "ACTIVE") {
        return { user, tenantId: cookieTenant.id, role: "TENANT_ADMIN", permissionOverrides: null, tenant: cookieTenant };
      }
    }
    const tenant = await resolveDefaultActiveTenant();
    return { user, tenantId: tenant.id, role: "TENANT_ADMIN", permissionOverrides: null, tenant };
  }

  // Regular member: only ACTIVE memberships on ACTIVE tenants can be chosen.
  // A stale cookie pointing at a suspended org must not lock the dashboard
  // if the user still has another live membership.
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE", tenant: { status: "ACTIVE" } },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    throw new TenantAccessError("User has no active tenant membership");
  }

  const chosen =
    (cookieTenantId && memberships.find((m) => m.tenantId === cookieTenantId)) ||
    memberships[0];

  return {
    user,
    tenantId: chosen.tenantId,
    role: chosen.role,
    permissionOverrides: (chosen.permissionOverrides as PermissionOverrides | null) ?? null,
    tenant: chosen.tenant,
  };
}

/** Active tenants the current user can act in. Used by the tenant switcher. */
export async function listMyTenants() {
  const user = await requireUser();
  if (user.isSuperAdmin) {
    return prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, status: true },
    });
  }
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE", tenant: { status: "ACTIVE" } },
    include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.tenant);
}

/** Active tenant a super admin should land in when they haven't picked one yet. */
async function resolveDefaultActiveTenant() {
  const primary = await prisma.tenant.findFirst({
    where: { isPrimary: true, status: "ACTIVE" },
  });
  if (primary) return primary;
  const fallback = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new TenantAccessError("No active tenant exists");
  return fallback;
}

/** Resolves the platform's primary/default tenant, used by unauthenticated public pages. */
export const getPrimaryTenantId = cache(async (): Promise<string> => {
  const primary = await prisma.tenant.findFirst({ where: { isPrimary: true }, select: { id: true } });
  if (primary) return primary.id;
  const fallback = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!fallback) throw new Error("No tenant exists yet");
  return fallback.id;
});

/**
 * Resolves the tenant for actions callable from BOTH public pages and the
 * admin dashboard (e.g. getPosts/getProjects) without changing their call
 * signatures: an authenticated tenant member gets their own tenant's data,
 * everyone else (public visitors) gets the primary tenant's public site.
 */
export async function getContextualTenantId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    try {
      const ctx = await requireTenantContext();
      return ctx.tenantId;
    } catch {
      // No resolvable acting tenant -- public visitors and locked-out
      // members fall through to the primary site.
    }
  }
  return getPrimaryTenantId();
}

/** Throws (as a not-found, not a 403 -- avoids confirming another tenant's record exists) if tenants don't match. */
export function assertOwnership(recordTenantId: string, currentTenantId: string): void {
  if (recordTenantId !== currentTenantId) {
    throw new TenantAccessError("Not found");
  }
}
