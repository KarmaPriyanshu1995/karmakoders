import { ReactNode } from "react";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export default async function CareersLayout({ children }: { children: ReactNode }) {
  const { role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.CAREER_VIEW, permissionOverrides);
  return children;
}
