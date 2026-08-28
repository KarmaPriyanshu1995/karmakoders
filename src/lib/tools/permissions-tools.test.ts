import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

describe("tools RBAC", () => {
  it("TENANT_ADMIN can manage tools", () => {
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.TOOLS_CREATE)).toBe(true);
    expect(hasPermission("TENANT_ADMIN", PERMISSIONS.TOOLS_UPDATE)).toBe(true);
  });

  it("EDITOR can manage tools", () => {
    expect(hasPermission("EDITOR", PERMISSIONS.TOOLS_UPDATE)).toBe(true);
  });

  it("unauthorized roles cannot publish tools", () => {
    expect(hasPermission("HR", PERMISSIONS.TOOLS_UPDATE)).toBe(false);
    expect(hasPermission("AUTHOR", PERMISSIONS.TOOLS_CREATE)).toBe(false);
  });

  it("VIEWER can see tools but not edit", () => {
    expect(hasPermission("VIEWER", PERMISSIONS.TOOLS_VIEW)).toBe(true);
    expect(hasPermission("VIEWER", PERMISSIONS.TOOLS_UPDATE)).toBe(false);
  });
});
