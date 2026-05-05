import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  loginWithEmail,
  logoutFromFirebase,
  onAuthChanged,
  signupWithEmail,
  subscribeAllUsers,
  upsertUserProfile,
} from "@/services/auth";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  users: User[];
  rememberedUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signup: (input: { name: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  continueWithRememberedSession: () => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  updateUserOrgId: (userId: string, orgId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeAuthError(error: unknown): string {
  const code = String((error as { code?: string })?.code ?? "");
  if (code.includes("auth/invalid-email")) return "Invalid email address.";
  if (code.includes("auth/email-already-in-use")) return "Email already in use.";
  if (code.includes("auth/weak-password")) return "Password is too weak.";
  if (code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password")) {
    return "Invalid email or password.";
  }
  return String((error as { message?: string })?.message ?? "Authentication failed.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthChanged(
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    const unsubscribeUsers = subscribeAllUsers(
      (nextUsers) => setUsers(nextUsers),
      () => undefined,
    );
    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await loginWithEmail(email, password);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: normalizeAuthError(error) };
    }
  }, []);

  const signup = useCallback(async (input: { name: string; email: string; password: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false as const, error: "Name is required." };
    if (!email) return { ok: false as const, error: "Email is required." };
    if (input.password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters." };
    try {
      await signupWithEmail({ name, email, password: input.password });
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: normalizeAuthError(error) };
    }
  }, []);

  const continueWithRememberedSession = useCallback(async () => {
    if (user) return { ok: true as const };
    return { ok: false as const, error: "No saved session." };
  }, [user]);

  const logout = useCallback(async () => {
    await logoutFromFirebase();
  }, []);

  const updateUserOrgId = useCallback(async (userId: string, orgId: string | null) => {
    const uid = userId.trim();
    if (!uid) return;
    await upsertUserProfile(uid, { orgId: orgId ?? null });
    setUser((prev) => (prev && prev.id === uid ? { ...prev, orgId: orgId ?? null } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      users,
      rememberedUser: user,
      loading,
      login,
      signup,
      continueWithRememberedSession,
      logout,
      updateUserOrgId,
    }),
    [user, users, loading, login, signup, continueWithRememberedSession, logout, updateUserOrgId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

