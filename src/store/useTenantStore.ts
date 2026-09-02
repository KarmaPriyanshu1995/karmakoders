import { create } from "zustand";
import type { MembershipRole } from "@prisma/client";
import { hasPermission, canViewSection, type Permission, type PermissionOverrides, type SectionKey } from "@/lib/permissions";

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
  currentPermissionOverrides: PermissionOverrides | null;
  memberships: TenantStoreTenant[];
  hydrate: (data: {
    currentUser: TenantStoreUser | null;
    currentTenant: TenantStoreTenant | null;
    currentRole: MembershipRole | null;
    currentPermissionOverrides?: PermissionOverrides | null;
    memberships: TenantStoreTenant[];
  }) => void;
  can: (permission: Permission) => boolean;
  canView: (section: SectionKey) => boolean;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  currentUser: null,
  currentTenant: null,
  currentRole: null,
  currentPermissionOverrides: null,
  memberships: [],
  hydrate: ({ currentPermissionOverrides, ...rest }) =>
    set({ ...rest, currentPermissionOverrides: currentPermissionOverrides ?? null }),
  can: (permission) => {
    const { currentUser, currentRole, currentPermissionOverrides } = get();
    if (currentUser?.isSuperAdmin) return true;
    if (!currentRole) return false;
    return hasPermission(currentRole, permission, currentPermissionOverrides);
  },
  canView: (section) => {
    const { currentUser, currentRole, currentPermissionOverrides } = get();
    if (currentUser?.isSuperAdmin) return true;
    if (!currentRole) return false;
    return canViewSection(currentRole, section, currentPermissionOverrides);
  },
}));
