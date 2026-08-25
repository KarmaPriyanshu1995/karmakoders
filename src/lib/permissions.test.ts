import { describe, it, expect } from "vitest";
import { hasPermission, assertPermission, canViewSection, buildPermissionOverrides, readSectionSelection, PERMISSIONS } from "./permissions";
import { TenantAccessError } from "./errors";

describe("permissions", () => {
  it("TENANT_ADMIN has every permission", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission("TENANT_ADMIN", permission)).toBe(true);
    }
  });

  it("VIEWER only has *_VIEW permissions", () => {
    expect(hasPermission("VIEWER", PERMISSIONS.BLOG_VIEW)).toBe(true);
    expect(hasPermission("VIEWER", PERMISSIONS.BLOG_CREATE)).toBe(false);
    expect(hasPermission("VIEWER", PERMISSIONS.USER_DELETE)).toBe(false);
    expect(hasPermission("VIEWER", PERMISSIONS.SETTINGS_UPDATE)).toBe(false);
  });

  it("EMPLOYEE only has *_VIEW permissions", () => {
    expect(hasPermission("EMPLOYEE", PERMISSIONS.PAGE_VIEW)).toBe(true);
    expect(hasPermission("EMPLOYEE", PERMISSIONS.PAGE_DELETE)).toBe(false);
  });

  it("EDITOR can manage content but not users or settings", () => {
    expect(hasPermission("EDITOR", PERMISSIONS.BLOG_CREATE)).toBe(true);
    expect(hasPermission("EDITOR", PERMISSIONS.PROJECT_DELETE)).toBe(true);
    expect(hasPermission("EDITOR", PERMISSIONS.USER_CREATE)).toBe(false);
    expect(hasPermission("EDITOR", PERMISSIONS.SETTINGS_UPDATE)).toBe(false);
  });

  it("HR can manage careers and view users but cannot touch blog", () => {
    expect(hasPermission("HR", PERMISSIONS.CAREER_CREATE)).toBe(true);
    expect(hasPermission("HR", PERMISSIONS.USER_VIEW)).toBe(true);
    expect(hasPermission("HR", PERMISSIONS.BLOG_CREATE)).toBe(false);
  });

  it("MANAGER has everything except managing users beyond viewing", () => {
    expect(hasPermission("MANAGER", PERMISSIONS.USER_VIEW)).toBe(true);
    expect(hasPermission("MANAGER", PERMISSIONS.USER_CREATE)).toBe(false);
    expect(hasPermission("MANAGER", PERMISSIONS.USER_DELETE)).toBe(false);
    expect(hasPermission("MANAGER", PERMISSIONS.BLOG_DELETE)).toBe(true);
  });

  it("assertPermission throws TenantAccessError when the role lacks the permission", () => {
    expect(() => assertPermission("VIEWER", PERMISSIONS.BLOG_DELETE)).toThrow(TenantAccessError);
  });

  it("assertPermission does not throw when the role has the permission", () => {
    expect(() => assertPermission("TENANT_ADMIN", PERMISSIONS.BLOG_DELETE)).not.toThrow();
  });
});

describe("per-member permission overrides", () => {
  it("a false override denies a permission the role would otherwise grant", () => {
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_VIEW)).toBe(true);
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_VIEW, { BLOG_VIEW: false })).toBe(false);
  });

  it("a true override grants a permission the role would otherwise lack", () => {
    expect(hasPermission("VIEWER", PERMISSIONS.SEO_VIEW, { SEO_VIEW: false })).toBe(false);
    expect(hasPermission("EDITOR", PERMISSIONS.USER_VIEW)).toBe(false);
    expect(hasPermission("EDITOR", PERMISSIONS.USER_VIEW, { USER_VIEW: true })).toBe(true);
  });

  it("assertPermission respects overrides too", () => {
    expect(() => assertPermission("TENANT_ADMIN", PERMISSIONS.USER_DELETE, { USER_DELETE: false })).toThrow(TenantAccessError);
    expect(() => assertPermission("VIEWER", PERMISSIONS.SEO_UPDATE, { SEO_UPDATE: true })).not.toThrow();
  });

  it("hiding a section denies its whole permission family, not just view", () => {
    const overrides = buildPermissionOverrides({ BLOG: "hide" });
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_VIEW, overrides)).toBe(false);
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_CREATE, overrides)).toBe(false);
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_UPDATE, overrides)).toBe(false);
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.BLOG_DELETE, overrides)).toBe(false);
    expect(canViewSection("TENANT_ADMIN", "BLOG", overrides)).toBe(false);
  });

  it("showing a section grants only its view permission, CRUD stays role-gated", () => {
    const overrides = buildPermissionOverrides({ USERS: "show" });
    expect(canViewSection("VIEWER", "USERS", overrides)).toBe(true);
    expect(hasPermission("VIEWER", PERMISSIONS.USER_CREATE, overrides)).toBe(false);
  });

  it("round-trips through readSectionSelection", () => {
    const overrides = buildPermissionOverrides({ BLOG: "hide", USERS: "show", SEO: null });
    expect(readSectionSelection(overrides)).toEqual({ BLOG: "hide", USERS: "show" });
  });
});
