import type { MembershipRole } from "@prisma/client";
import { TenantAccessError } from "@/lib/errors";

export const PERMISSIONS = {
  BLOG_VIEW: "BLOG_VIEW",
  BLOG_CREATE: "BLOG_CREATE",
  BLOG_UPDATE: "BLOG_UPDATE",
  BLOG_DELETE: "BLOG_DELETE",

  PAGE_VIEW: "PAGE_VIEW",
  PAGE_CREATE: "PAGE_CREATE",
  PAGE_UPDATE: "PAGE_UPDATE",
  PAGE_DELETE: "PAGE_DELETE",

  PROJECT_VIEW: "PROJECT_VIEW",
  PROJECT_CREATE: "PROJECT_CREATE",
  PROJECT_UPDATE: "PROJECT_UPDATE",
  PROJECT_DELETE: "PROJECT_DELETE",

  CAREER_VIEW: "CAREER_VIEW",
  CAREER_CREATE: "CAREER_CREATE",
  CAREER_UPDATE: "CAREER_UPDATE",
  CAREER_DELETE: "CAREER_DELETE",

  INQUIRY_VIEW: "INQUIRY_VIEW",

  MEDIA_VIEW: "MEDIA_VIEW",
  MEDIA_CREATE: "MEDIA_CREATE",
  MEDIA_DELETE: "MEDIA_DELETE",

  USER_VIEW: "USER_VIEW",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",

  SETTINGS_VIEW: "SETTINGS_VIEW",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",

  SEO_VIEW: "SEO_VIEW",
  SEO_UPDATE: "SEO_UPDATE",

  TOOLS_VIEW: "TOOLS_VIEW",
  TOOLS_CREATE: "TOOLS_CREATE",
  TOOLS_UPDATE: "TOOLS_UPDATE",
  TOOLS_DELETE: "TOOLS_DELETE",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

const VIEW_ONLY = ALL_PERMISSIONS.filter((p) => p.endsWith("_VIEW"));

/**
 * Role -> permission matrix. TENANT_ADMIN has full control of its tenant.
 * The other roles are prepared per Phase 4 for future use but aren't yet
 * assignable from the admin UI in Phase 1.
 */
const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  TENANT_ADMIN: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter((p) => !p.startsWith("USER_") || p === "USER_VIEW"),
  EDITOR: [
    PERMISSIONS.BLOG_VIEW, PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_UPDATE, PERMISSIONS.BLOG_DELETE,
    PERMISSIONS.PAGE_VIEW, PERMISSIONS.PAGE_CREATE, PERMISSIONS.PAGE_UPDATE, PERMISSIONS.PAGE_DELETE,
    PERMISSIONS.PROJECT_VIEW, PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_UPDATE, PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_CREATE, PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.SEO_VIEW, PERMISSIONS.SEO_UPDATE,
    PERMISSIONS.TOOLS_VIEW, PERMISSIONS.TOOLS_CREATE, PERMISSIONS.TOOLS_UPDATE, PERMISSIONS.TOOLS_DELETE,
  ],
  AUTHOR: [PERMISSIONS.BLOG_VIEW, PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_UPDATE, PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_CREATE],
  HR: [PERMISSIONS.CAREER_VIEW, PERMISSIONS.CAREER_CREATE, PERMISSIONS.CAREER_UPDATE, PERMISSIONS.CAREER_DELETE, PERMISSIONS.USER_VIEW],
  EMPLOYEE: VIEW_ONLY,
  VIEWER: VIEW_ONLY,
};

/**
 * Per-member permission overrides layered on top of the role matrix
 * (stored as `Membership.permissionOverrides`). Keyed by Permission;
 * `true` force-grants, `false` force-denies, absent inherits the role.
 */
export type PermissionOverrides = Partial<Record<Permission, boolean>>;

/**
 * Groups permissions into the admin-sidebar "sections" a tenant admin can
 * individually show or hide for a given member. Each section's `view`
 * permission gates that section's visibility/entry; `managed` lists every
 * permission that gets force-denied when the section is hidden, so hiding
 * a section also blocks direct create/update/delete on it -- not just the
 * sidebar link.
 */
export const SECTIONS = {
  PAGES: { label: "Pages & Sections", view: PERMISSIONS.PAGE_VIEW, managed: [PERMISSIONS.PAGE_VIEW, PERMISSIONS.PAGE_CREATE, PERMISSIONS.PAGE_UPDATE, PERMISSIONS.PAGE_DELETE] },
  BLOG: { label: "Blog Posts", view: PERMISSIONS.BLOG_VIEW, managed: [PERMISSIONS.BLOG_VIEW, PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_UPDATE, PERMISSIONS.BLOG_DELETE] },
  PROJECTS: { label: "Projects", view: PERMISSIONS.PROJECT_VIEW, managed: [PERMISSIONS.PROJECT_VIEW, PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_UPDATE, PERMISSIONS.PROJECT_DELETE] },
  CAREERS: { label: "Careers", view: PERMISSIONS.CAREER_VIEW, managed: [PERMISSIONS.CAREER_VIEW, PERMISSIONS.CAREER_CREATE, PERMISSIONS.CAREER_UPDATE, PERMISSIONS.CAREER_DELETE] },
  INQUIRIES: { label: "Inquiries", view: PERMISSIONS.INQUIRY_VIEW, managed: [PERMISSIONS.INQUIRY_VIEW] },
  MEDIA: { label: "Media Library", view: PERMISSIONS.MEDIA_VIEW, managed: [PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_CREATE, PERMISSIONS.MEDIA_DELETE] },
  USERS: { label: "Users", view: PERMISSIONS.USER_VIEW, managed: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE] },
  SEO: { label: "SEO Intelligence", view: PERMISSIONS.SEO_VIEW, managed: [PERMISSIONS.SEO_VIEW, PERMISSIONS.SEO_UPDATE] },
  TOOLS: { label: "Tools", view: PERMISSIONS.TOOLS_VIEW, managed: [PERMISSIONS.TOOLS_VIEW, PERMISSIONS.TOOLS_CREATE, PERMISSIONS.TOOLS_UPDATE, PERMISSIONS.TOOLS_DELETE] },
  SETTINGS: { label: "Settings", view: PERMISSIONS.SETTINGS_VIEW, managed: [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_UPDATE] },
} as const;

export type SectionKey = keyof typeof SECTIONS;

export function hasPermission(role: MembershipRole, permission: Permission, overrides?: PermissionOverrides | null): boolean {
  const override = overrides?.[permission];
  if (override !== undefined) return override;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertPermission(role: MembershipRole, permission: Permission, overrides?: PermissionOverrides | null): void {
  if (!hasPermission(role, permission, overrides)) {
    throw new TenantAccessError(`Role ${role} lacks permission ${permission}`);
  }
}

/** Whether a given section is visible to this role+overrides combination. */
export function canViewSection(role: MembershipRole, section: SectionKey, overrides?: PermissionOverrides | null): boolean {
  return hasPermission(role, SECTIONS[section].view, overrides);
}

/**
 * Merges a `{ [SectionKey]: "show" | "hide" | null }` UI selection into a
 * stored PermissionOverrides map. "show" force-grants just the section's
 * view permission (finer create/update/delete stays role-governed); "hide"
 * force-denies every permission in that section; null/undefined clears the
 * override and falls back to the role default.
 */
export function buildPermissionOverrides(selection: Partial<Record<SectionKey, "show" | "hide" | null>>): PermissionOverrides {
  const overrides: PermissionOverrides = {};
  for (const key of Object.keys(SECTIONS) as SectionKey[]) {
    const choice = selection[key];
    const { view, managed } = SECTIONS[key];
    if (choice === "hide") {
      for (const permission of managed) overrides[permission] = false;
    } else if (choice === "show") {
      overrides[view] = true;
    }
  }
  return overrides;
}

/** Reads a stored PermissionOverrides map back into the UI's per-section selection. */
export function readSectionSelection(overrides: PermissionOverrides | null | undefined): Partial<Record<SectionKey, "show" | "hide">> {
  const selection: Partial<Record<SectionKey, "show" | "hide">> = {};
  for (const key of Object.keys(SECTIONS) as SectionKey[]) {
    const { view, managed } = SECTIONS[key];
    if (managed.some((p) => overrides?.[p] === false)) {
      selection[key] = "hide";
    } else if (overrides?.[view] === true) {
      selection[key] = "show";
    }
  }
  return selection;
}
