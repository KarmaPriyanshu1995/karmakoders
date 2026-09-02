import { ReactNode } from "react";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export default async function MediaLayout({ children }: { children: ReactNode }) {
  const { role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.MEDIA_VIEW, permissionOverrides);
  return children;
}