import { ReactNode } from "react";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export default async function PagesLayout({ children }: { children: ReactNode }) {
  const { role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_VIEW, permissionOverrides);
  return children;
}
