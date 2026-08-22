import { create } from "zustand";
import type { MembershipRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

export interface TenantStoreUser {
  id: string;
  name: string | null;
  email: string;
  isSuperAdmin: boolean;
}

export interface TenantStoreTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface TenantState {
  currentUser: TenantStoreUser | null;
  currentTenant: TenantStoreTenant | null;
  currentRole: MembershipRole | null;
  memberships: TenantStoreTenant[];
  hydrate: (data: {
    currentUser: TenantStoreUser | null;
    currentTenant: TenantStoreTenant | null;
    currentRole: MembershipRole | null;
    memberships: TenantStoreTenant[];
  }) => void;
  can: (permission: Permission) => boolean;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  currentUser: null,
  currentTenant: null,
  currentRole: null,
  memberships: [],
  hydrate: (data) => set(data),
  can: (permission) => {
    const { currentUser, currentRole } = get();
    if (currentUser?.isSuperAdmin) return true;
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  },
}));
