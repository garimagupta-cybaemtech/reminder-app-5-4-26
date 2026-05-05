import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { loadOrganizations, saveOrganizations } from "@/storage/organizationStorage";
import type { Organization, OrganizationRole, User } from "@/types";
import { genId } from "@/utils/dates";

interface OrganizationContextValue {
  organizations: Organization[];
  organization: Organization | null;
  role: OrganizationRole | null;
  loading: boolean;
  createOrganization: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  joinOrganization: (organizationId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  addMember: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeMember: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  organizationMembers: Array<{ user: User; role: OrganizationRole }>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, users, updateUserOrgId } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations()
      .then((orgs) => setOrganizations(orgs))
      .finally(() => setLoading(false));
  }, []);

  const organization = useMemo(() => {
    if (!user) return null;
    return organizations.find((org) => org.members.some((m) => m.userId === user.id)) ?? null;
  }, [organizations, user?.id]);

  const role = useMemo<OrganizationRole | null>(() => {
    if (!user || !organization) return null;
    return organization.members.find((m) => m.userId === user.id)?.role ?? null;
  }, [organization, user?.id]);

  const persist = useCallback(async (next: Organization[]) => {
    setOrganizations(next);
    await saveOrganizations(next);
  }, []);

  const createOrganization = useCallback(async (name: string) => {
    if (!user) return { ok: false as const, error: "Sign in required." };
    if (organization) return { ok: false as const, error: "You are already in an organization." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false as const, error: "Organization name is required." };
    const nextOrg: Organization = {
      id: `org-${genId()}`,
      name: trimmed,
      members: [{ userId: user.id, role: "Admin" }],
      createdAt: Date.now(),
    };
    await persist([nextOrg, ...organizations]);
    await updateUserOrgId(user.id, nextOrg.id);
    return { ok: true as const };
  }, [organization, organizations, persist, updateUserOrgId, user?.id]);

  const joinOrganization = useCallback(async (organizationId: string) => {
    if (!user) return { ok: false as const, error: "Sign in required." };
    if (organization) return { ok: false as const, error: "Leave current organization first." };
    const id = organizationId.trim();
    if (!id) return { ok: false as const, error: "Organization ID is required." };
    const target = organizations.find((org) => org.id.toLowerCase() === id.toLowerCase());
    if (!target) return { ok: false as const, error: "Organization not found." };
    if (target.members.some((m) => m.userId === user.id)) return { ok: true as const };
    const next = organizations.map((org) =>
      org.id === target.id
        ? { ...org, members: [...org.members, { userId: user.id, role: "Member" as const }] }
        : org,
    );
    await persist(next);
    await updateUserOrgId(user.id, target.id);
    return { ok: true as const };
  }, [organization, organizations, persist, updateUserOrgId, user?.id]);

  const addMember = useCallback(async (userId: string) => {
    if (!user || !organization) return { ok: false as const, error: "Organization not found." };
    if (role !== "Admin") return { ok: false as const, error: "Admin access required." };
    if (organization.members.some((m) => m.userId === userId)) return { ok: true as const };
    const next = organizations.map((org) =>
      org.id === organization.id
        ? { ...org, members: [...org.members, { userId, role: "Member" as const }] }
        : org,
    );
    await persist(next);
    return { ok: true as const };
  }, [organization?.id, organizations, persist, role, user?.id]);

  const removeMember = useCallback(async (userId: string) => {
    if (!user || !organization) return { ok: false as const, error: "Organization not found." };
    if (role !== "Admin") return { ok: false as const, error: "Admin access required." };
    if (userId === user.id) return { ok: false as const, error: "Admin cannot remove self." };
    const next = organizations.map((org) =>
      org.id === organization.id
        ? { ...org, members: org.members.filter((m) => m.userId !== userId) }
        : org,
    );
    await persist(next);
    return { ok: true as const };
  }, [organization?.id, organizations, persist, role, user?.id]);

  const organizationMembers = useMemo(() => {
    if (!organization) return [];
    return organization.members
      .map((member) => {
        const found = users.find((u) => u.id === member.userId);
        if (!found) return null;
        return { user: found, role: member.role };
      })
      .filter((x): x is { user: User; role: OrganizationRole } => !!x);
  }, [organization, users]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      organization,
      role,
      loading,
      createOrganization,
      joinOrganization,
      addMember,
      removeMember,
      organizationMembers,
    }),
    [
      organizations,
      organization,
      role,
      loading,
      createOrganization,
      joinOrganization,
      addMember,
      removeMember,
      organizationMembers,
    ],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
