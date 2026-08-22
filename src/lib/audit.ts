import "server-only";
import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  TENANT_CREATED: "TENANT_CREATED",
  TENANT_SUSPENDED: "TENANT_SUSPENDED",
  TENANT_ACTIVATED: "TENANT_ACTIVATED",
  USER_CREATED: "USER_CREATED",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  MEMBERSHIP_SUSPENDED: "MEMBERSHIP_SUSPENDED",
  MEMBERSHIP_ACTIVATED: "MEMBERSHIP_ACTIVATED",
  MEMBERSHIP_REMOVED: "MEMBERSHIP_REMOVED",
  PASSWORD_RESET: "PASSWORD_RESET",
  BLOG_CREATED: "BLOG_CREATED",
  BLOG_UPDATED: "BLOG_UPDATED",
  BLOG_PUBLISHED: "BLOG_PUBLISHED",
  BLOG_DELETED: "BLOG_DELETED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface LogAuditInput {
  tenantId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/** Best-effort audit trail. Never throws -- a logging failure must not break the actual operation. */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record audit log entry:", err);
  }
}
