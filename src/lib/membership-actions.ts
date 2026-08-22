"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { MembershipRole, MembershipStatus, TenantStatus } from "@prisma/client";
import { requireTenantContext, requireSuperAdmin, requireUser, setActiveTenantCookie, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

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

// ─── Tenant-scoped: used by TENANT_ADMIN's own "/admin/users" page ────────────

export async function listMyTenantMembers() {
  const { tenantId, role } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.USER_VIEW);
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
  const { tenantId, role: actorRole, user: actor } = await requireTenantContext();
  assertPermission(actorRole, PERMISSIONS.USER_CREATE);
  return createMembershipInternal(tenantId, input, actor.id);
}

export async function updateMemberRole(membershipId: string, role: MembershipRole) {
  const { tenantId, role: actorRole, user: actor } = await requireTenantContext();
  assertPermission(actorRole, PERMISSIONS.USER_UPDATE);
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.USER_ROLE_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { newRole: role } });
  revalidatePath("/admin/users");
  return updated;
}

export async function updateMemberStatus(membershipId: string, status: MembershipStatus) {
  const { tenantId, role: actorRole, user: actor } = await requireTenantContext();
  assertPermission(actorRole, PERMISSIONS.USER_UPDATE);
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { status } });
  await logAudit({
    tenantId,
    userId: actor.id,
    action: status === "SUSPENDED" ? AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED : AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
    resource: "Membership",
    resourceId: membershipId,
  });
  revalidatePath("/admin/users");
  return updated;
}

export async function resetMemberPassword(membershipId: string) {
  const { tenantId, role: actorRole, user: actor } = await requireTenantContext();
  assertPermission(actorRole, PERMISSIONS.USER_UPDATE);
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  return resetPasswordInternal(tenantId, membership.userId, actor.id);
}

export async function removeMember(membershipId: string) {
  const { tenantId, role: actorRole, user: actor } = await requireTenantContext();
  assertPermission(actorRole, PERMISSIONS.USER_DELETE);
  const { count } = await prisma.membership.deleteMany({ where: { id: membershipId, tenantId } });
  if (count === 0) throw new TenantAccessError("Member not found");
  await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.MEMBERSHIP_REMOVED, resource: "Membership", resourceId: membershipId });
  revalidatePath("/admin/users");
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

  const slug = slugify(input.slug || input.name);
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new Error(`Slug "${slug}" is already in use`);

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
  return { tenant, tempPassword };
}

export async function setTenantStatus(tenantId: string, status: TenantStatus) {
  const actor = await requireSuperAdmin();
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  await logAudit({
    tenantId,
    userId: actor.id,
    action: status === "SUSPENDED" ? AUDIT_ACTIONS.TENANT_SUSPENDED : AUDIT_ACTIONS.TENANT_ACTIVATED,
    resource: "Tenant",
    resourceId: tenantId,
  });
  revalidatePath("/admin/platform/tenants");
  return tenant;
}

export async function addTenantMemberAsSuperAdmin(tenantId: string, input: CreateMemberInput) {
  const actor = await requireSuperAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new TenantAccessError("Tenant not found");
  const result = await createMembershipInternal(tenantId, input, actor.id);
  revalidatePath(`/admin/platform/tenants/${tenantId}`);
  return result;
}

export async function updateMemberRoleAsSuperAdmin(tenantId: string, membershipId: string, role: MembershipRole) {
  const actor = await requireSuperAdmin();
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.USER_ROLE_CHANGED, resource: "Membership", resourceId: membershipId, metadata: { newRole: role } });
  revalidatePath(`/admin/platform/tenants/${tenantId}`);
  return updated;
}

export async function updateMemberStatusAsSuperAdmin(tenantId: string, membershipId: string, status: MembershipStatus) {
  const actor = await requireSuperAdmin();
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { status } });
  await logAudit({
    tenantId,
    userId: actor.id,
    action: status === "SUSPENDED" ? AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED : AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
    resource: "Membership",
    resourceId: membershipId,
  });
  revalidatePath(`/admin/platform/tenants/${tenantId}`);
  return updated;
}

export async function resetMemberPasswordAsSuperAdmin(tenantId: string, membershipId: string) {
  const actor = await requireSuperAdmin();
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) throw new TenantAccessError("Member not found");
  return resetPasswordInternal(tenantId, membership.userId, actor.id);
}

export async function removeMemberAsSuperAdmin(tenantId: string, membershipId: string) {
  const actor = await requireSuperAdmin();
  const { count } = await prisma.membership.deleteMany({ where: { id: membershipId, tenantId } });
  if (count === 0) throw new TenantAccessError("Member not found");
  await logAudit({ tenantId, userId: actor.id, action: AUDIT_ACTIONS.MEMBERSHIP_REMOVED, resource: "Membership", resourceId: membershipId });
  revalidatePath(`/admin/platform/tenants/${tenantId}`);
}

// ─── Tenant switching (Phase 10) ───────────────────────────────────────────

export async function switchActiveTenant(tenantId: string) {
  const user = await requireUser();

  if (user.isSuperAdmin) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new TenantAccessError("Tenant not found");
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });
    if (!membership || membership.status !== "ACTIVE") {
      throw new TenantAccessError("You are not an active member of this tenant");
    }
  }

  await setActiveTenantCookie(tenantId);
  revalidatePath("/admin");
}

// ─── Shared implementation ─────────────────────────────────────────────────

async function createMembershipInternal(tenantId: string, input: CreateMemberInput, actorId: string) {
  let user = await prisma.user.findUnique({ where: { email: input.email } });
  let tempPassword: string | null = null;

  if (!user) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    await logAudit({ tenantId, userId: actorId, action: AUDIT_ACTIONS.USER_CREATED, resource: "User", resourceId: user.id });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (existingMembership) {
    throw new Error("This person is already a member of this tenant");
  }

  const membership = await prisma.membership.create({
    data: { userId: user.id, tenantId, role: input.role, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  revalidatePath("/admin/users");
  return { membership, tempPassword };
}

async function resetPasswordInternal(tenantId: string, userId: string, actorId: string) {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({ tenantId, userId: actorId, action: AUDIT_ACTIONS.PASSWORD_RESET, resource: "User", resourceId: userId });
  revalidatePath("/admin/users");
  return { tempPassword };
}
