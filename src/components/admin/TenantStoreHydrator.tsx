"use client";

import { useEffect } from "react";
import { useTenantStore, type TenantStoreUser, type TenantStoreTenant } from "@/store/useTenantStore";
import type { MembershipRole } from "@prisma/client";

interface TenantStoreHydratorProps {
  currentUser: TenantStoreUser | null;
  currentTenant: TenantStoreTenant | null;
  currentRole: MembershipRole | null;
  memberships: TenantStoreTenant[];
}

/** Syncs server-verified session/tenant data into the client-side zustand store once on mount. */
export function TenantStoreHydrator(props: TenantStoreHydratorProps) {
  const hydrate = useTenantStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.currentUser?.id, props.currentTenant?.id, props.currentRole]);

  return null;
}
