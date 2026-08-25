"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { MembershipRole, MembershipStatus, TenantStatus } from "@prisma/client";
import { requireTenantContext, requireSuperAdmin, requireUser, setActiveTenantCookie, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS, type PermissionOverrides } from "@/lib/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { publicActionError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/email";

export type ResetPasswordResult = { tempPassword: string | null; error: string | null };

type SerializedMembership = { id: string; role: MembershipRole; status: MembershipStatus };

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "tenant";
}

function serializeMembership(m: SerializedMembership): SerializedMembership {
  return { id: m.id, role: m.role, status: m.status };
}

async function assertKeepsActiveTenantAdmin(
  tenantId: string,
  membership: SerializedMembership,
  next: { role?: MembershipRole; status?: MembershipStatus; removing?: boolean }
) {
  const currentlyAdmin = membership.role === "TENANT_ADMIN" && membership.status === "ACTIVE";
  if (!currentlyAdmin) return;
  const stillAdmin =
    !next.removing &&
    (next.role ?? membership.role) === "TENANT_ADMIN" &&
    (next.status ?? membership.status) === "ACTIVE";
  if (stillAdmin) return;
  const remaining = await prisma.membership.count({
    where: { tenantId, role: "TENANT_ADMIN", status: "ACTIVE", id: { not: membership.id } },
  });
  if (remaining === 0) {
    throw new TenantAccessError("Keep at least one active tenant admin");
  }
}

// ─── Tenant-scoped: used by TENANT_ADMIN's own "/admin/users" page ────────────

export async function listMyTenantMembers() {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.USER_VIEW, permissionOverrides);
  return prisma.membership.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
}

interface CreateMemberInput {
  name: string;
  email: string;
  role: MembershipRole;
}

export async function createTenantMember(input: CreateMemberInput) {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_CREATE, permissionOverrides);
    const result = await createMembershipInternal(tenantId, input, actor.id);
    return { ...result, error: null as string | null };
  } catch (error) {
    return { membership: null, tempPassword: null, error: publicActionError(error) };
  }
}

export async function updateMemberRole(membershipId: string, role: MembershipRole) {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_UPDATE, permissionOverrides);
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await assertKeepsActiveTenantAdmin(tenantId, membership, { role });
    const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.USER_ROLE_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { newRole: role } });
    revalidatePath("/admin/users");
    return { ...serializeMembership(updated), error: null as string | null };
  } catch (error) {
    return { id: null, role: null, status: null, error: publicActionError(error) };
  }
}

export async function updateMemberStatus(membershipId: string, status: MembershipStatus) {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_UPDATE, permissionOverrides);
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    if (membership.userId === actor.id && status === "SUSPENDED") {
      throw new TenantAccessError("You cannot suspend your own access");
    }
    await assertKeepsActiveTenantAdmin(tenantId, membership, { status });
    const updated = await prisma.membership.update({ where: { id: membershipId }, data: { status } });
    await logAudit({
      tenantId,
      userId: actor.id,
      action: status === "SUSPENDED" ? AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED : AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
      resource: "Membership",
      resourceId: membershipId,
    });
    revalidatePath("/admin/users");
    return { ...serializeMembership(updated), error: null as string | null };
  } catch (error) {
    return { id: null, role: null, status: null, error: publicActionError(error) };
  }
}

export async function resetMemberPassword(membershipId: string): Promise<ResetPasswordResult> {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_UPDATE, permissionOverrides);
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) return { tempPassword: null, error: "Member not found" };
    const { tempPassword } = await resetPasswordInternal(tenantId, membership.userId, actor.id);
    return { tempPassword, error: null };
  } catch (error) {
    return { tempPassword: null, error: publicActionError(error) };
  }
}

export async function updateMemberPermissions(membershipId: string, overrides: PermissionOverrides) {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_UPDATE, permissionOverrides);
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await prisma.membership.update({
      where: { id: membershipId },
      data: { permissionOverrides: overrides },
    });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.PERMISSIONS_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { overrides } });
    revalidatePath("/admin/users");
    return { error: null as string | null };
  } catch (error) {
    return { error: publicActionError(error) };
  }
}

export async function removeMember(membershipId: string) {
  try {
    const { tenantId, role: actorRole, permissionOverrides, user: actor } = await requireTenantContext();
    assertPermission(actorRole, PERMISSIONS.USER_DELETE, permissionOverrides);
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    if (membership.userId === actor.id) {
      throw new TenantAccessError("You cannot remove your own access");
    }
    await assertKeepsActiveTenantAdmin(tenantId, membership, { removing: true });
    await prisma.membership.delete({ where: { id: membershipId } });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.MEMBERSHIP_REMOVED, resource: "Membership", resourceId: membershipId });
    revalidatePath("/admin/users");
    return { error: null as string | null };
  } catch (error) {
    return { error: publicActionError(error) };
  }
}

// ─── Platform-scoped: used by SUPER_ADMIN's "/admin/platform/tenants" ─────────

export async function listTenants() {
  await requireSuperAdmin();
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });
}

export async function getTenantDetail(tenantId: string) {
  await requireSuperAdmin();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tenant) throw new TenantAccessError("Tenant not found");
  return tenant;
}

interface CreateTenantInput {
  name: string;
  slug?: string;
  email?: string;
  adminName: string;
  adminEmail: string;
}

export async function createTenant(input: CreateTenantInput) {
  const actor = await requireSuperAdmin();
  try {
    const slug = slugify(input.slug || input.name);
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) throw new TenantAccessError(`Slug "${slug}" is already in use`);

    const tenant = await prisma.tenant.create({
      data: { name: input.name, slug, email: input.email || undefined, status: "ACTIVE" },
    });

    await logAudit({ tenantId: tenant.id, userId: actor.id, action: AUDIT_ACTIONS.TENANT_CREATED, resource: "Tenant", resourceId: tenant.id, metadata: { name: tenant.name } });

    const { tempPassword } = await createMembershipInternal(
      tenant.id,
      { name: input.adminName, email: input.adminEmail, role: "TENANT_ADMIN" },
      actor.id
    );

    revalidatePath("/admin/platform/tenants");
    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, isPrimary: tenant.isPrimary },
      tempPassword,
      error: null as string | null,
    };
  } catch (error) {
    return { tenant: null, tempPassword: null, error: publicActionError(error) };
  }
}

export async function setTenantStatus(tenantId: string, status: TenantStatus) {
  const actor = await requireSuperAdmin();
  try {
    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) throw new TenantAccessError("Tenant not found");
    if (status === "SUSPENDED" && existing.isPrimary) {
      throw new TenantAccessError("The primary tenant cannot be suspended");
    }
    const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
    await logAudit({
      tenantId,
      userId: actor.id,
      action: status === "SUSPENDED" ? AUDIT_ACTIONS.TENANT_SUSPENDED : AUDIT_ACTIONS.TENANT_ACTIVATED,
      resource: "Tenant",
      resourceId: tenantId,
    });
    revalidatePath("/admin/platform/tenants");
    return { id: tenant.id, status: tenant.status, error: null as string | null };
  } catch (error) {
    return { id: null, status: null, error: publicActionError(error) };
  }
}

export async function addTenantMemberAsSuperAdmin(tenantId: string, input: CreateMemberInput) {
  try {
    const actor = await requireSuperAdmin();
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { membership: null, tempPassword: null, error: "Tenant not found" };
    const result = await createMembershipInternal(tenantId, input, actor.id);
    revalidatePath(`/admin/platform/tenants/${tenantId}`);
    return { ...result, error: null as string | null };
  } catch (error) {
    return { membership: null, tempPassword: null, error: publicActionError(error) };
  }
}

export async function updateMemberRoleAsSuperAdmin(tenantId: string, membershipId: string, role: MembershipRole) {
  try {
    const actor = await requireSuperAdmin();
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await assertKeepsActiveTenantAdmin(tenantId, membership, { role });
    const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.USER_ROLE_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { newRole: role } });
    revalidatePath(`/admin/platform/tenants/${tenantId}`);
    return { ...serializeMembership(updated), error: null as string | null };
  } catch (error) {
    return { id: null, role: null, status: null, error: publicActionError(error) };
  }
}

export async function updateMemberStatusAsSuperAdmin(tenantId: string, membershipId: string, status: MembershipStatus) {
  try {
    const actor = await requireSuperAdmin();
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await assertKeepsActiveTenantAdmin(tenantId, membership, { status });
    const updated = await prisma.membership.update({ where: { id: membershipId }, data: { status } });
    await logAudit({
      tenantId,
      userId: actor.id,
      action: status === "SUSPENDED" ? AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED : AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
      resource: "Membership",
      resourceId: membershipId,
    });
    revalidatePath(`/admin/platform/tenants/${tenantId}`);
    return { ...serializeMembership(updated), error: null as string | null };
  } catch (error) {
    return { id: null, role: null, status: null, error: publicActionError(error) };
  }
}

export async function resetMemberPasswordAsSuperAdmin(tenantId: string, membershipId: string): Promise<ResetPasswordResult> {
  try {
    const actor = await requireSuperAdmin();
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) return { tempPassword: null, error: "Member not found" };
    const { tempPassword } = await resetPasswordInternal(tenantId, membership.userId, actor.id);
    return { tempPassword, error: null };
  } catch (error) {
    return { tempPassword: null, error: publicActionError(error) };
  }
}

export async function updateMemberPermissionsAsSuperAdmin(tenantId: string, membershipId: string, overrides: PermissionOverrides) {
  try {
    const actor = await requireSuperAdmin();
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await prisma.membership.update({
      where: { id: membershipId },
      data: { permissionOverrides: overrides },
    });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.PERMISSIONS_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { overrides } });
    revalidatePath(`/admin/platform/tenants/${tenantId}`);
    return { error: null as string | null };
  } catch (error) {
    return { error: publicActionError(error) };
  }
}

export async function removeMemberAsSuperAdmin(tenantId: string, membershipId: string) {
  try {
    const actor = await requireSuperAdmin();
    const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new TenantAccessError("Member not found");
    await assertKeepsActiveTenantAdmin(tenantId, membership, { removing: true });
    await prisma.membership.delete({ where: { id: membershipId } });
    await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.MEMBERSHIP_REMOVED, resource: "Membership", resourceId: membershipId });
    revalidatePath(`/admin/platform/tenants/${tenantId}`);
    return { error: null as string | null };
  } catch (error) {
    return { error: publicActionError(error) };
  }
}

// ─── Tenant switching (Phase 10) ───────────────────────────────────────────

export async function switchActiveTenant(tenantId: string) {
  try {
    const user = await requireUser();

    if (user.isSuperAdmin) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new TenantAccessError("Tenant not found");
      if (tenant.status !== "ACTIVE") throw new TenantAccessError("Tenant is suspended");
    } else {
      const membership = await prisma.membership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId } },
        include: { tenant: true },
      });
      if (!membership || membership.status !== "ACTIVE") {
        throw new TenantAccessError("You are not an active member of this tenant");
      }
      if (membership.tenant.status !== "ACTIVE") {
        throw new TenantAccessError("Tenant is suspended");
      }
    }

    await setActiveTenantCookie(tenantId);
    revalidatePath("/admin");
    return { error: null as string | null };
  } catch (error) {
    return { error: publicActionError(error) };
  }
}

// ─── Shared implementation ─────────────────────────────────────────────────

async function createMembershipInternal(tenantId: string, input: CreateMemberInput, actorId: string) {
  const email = normalizeEmail(input.email);
  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  let tempPassword: string | null = null;

  if (!user) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({
      data: { name: input.name, email, passwordHash },
    });
    await logAudit({ tenantId, userId: actorId, action: AUDIT_ACTIONS.USER_CREATED, resource: "User", resourceId: user.id });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (existingMembership) {
    throw new TenantAccessError("This person is already a member of this tenant");
  }

  const membership = await prisma.membership.create({
    data: { userId: user.id, tenantId, role: input.role, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  revalidatePath("/admin/users");
  return {
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      user: membership.user,
    },
    tempPassword,
  };
}

async function resetPasswordInternal(tenantId: string, userId: string, actorId: string) {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({ tenantId, userId: actorId, action: AUDIT_ACTIONS.PASSWORD_RESET, resource: "User", resourceId: userId });
  revalidatePath("/admin/users");
  return { tempPassword };
}
