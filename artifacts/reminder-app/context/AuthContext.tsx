import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { clearSession, loadSessionUserId, loadUsers, saveSessionUserId, saveUsers } from "@/storage/authStorage";
import type { User } from "@/types";
import { genId } from "@/utils/dates";

const DEFAULT_USERS: User[] = [
  {
    id: "u-alice",
    username: "alice",
    password: "alice123",
    name: "Alice Johnson",
    color: "#1a73e8",
  },
  {
    id: "u-bob",
    username: "bob",
    password: "bob123",
    name: "Bob Martinez",
    color: "#e8710a",
  },
  {
    id: "u-carol",
    username: "carol",
    password: "carol123",
    name: "Carol Singh",
    color: "#7627bb",
  },
  {
    id: "u-david",
    username: "david",
    password: "david123",
    name: "David Park",
    color: "#16a765",
  },
];

interface AuthContextValue {
  user: User | null;
  users: User[];
  rememberedUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  signup: (input: { name: string; username: string; password: string }) => { ok: true } | { ok: false; error: string };
  continueWithRememberedSession: () => { ok: true } | { ok: false; error: string };
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rememberedUser, setRememberedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadUsers(), loadSessionUserId()]).then(([savedUsers, id]) => {
      if (!mounted) return;
      const allUsers = savedUsers.length ? savedUsers : DEFAULT_USERS;
      setUsers(allUsers);
      if (!savedUsers.length) {
        saveUsers(allUsers).catch(() => undefined);
      }
      if (id) {
        const u = allUsers.find((x) => x.id === id) ?? null;
        setRememberedUser(u);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((username: string, password: string) => {
    const u = users.find(
      (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
    );
    if (!u) return { ok: false as const, error: "User not found." };
    if (u.password !== password) return { ok: false as const, error: "Wrong password." };
    setUser(u);
    setRememberedUser(u);
    saveSessionUserId(u.id).catch(() => undefined);
    return { ok: true as const };
  }, [users]);

  const signup = useCallback((input: { name: string; username: string; password: string }) => {
    const username = input.username.trim().toLowerCase();
    const name = input.name.trim();
    if (!name) return { ok: false as const, error: "Name is required." };
    if (!username) return { ok: false as const, error: "Username is required." };
    if (input.password.length < 4) return { ok: false as const, error: "Password must be at least 4 characters." };
    if (users.some((u) => u.username.toLowerCase() === username)) {
      return { ok: false as const, error: "Username already taken." };
    }
    const palette = ["#1a73e8", "#e8710a", "#7627bb", "#16a765", "#d93025", "#0b8043"];
    const newUser: User = {
      id: `u-${genId()}`,
      username,
      password: input.password,
      name,
      color: palette[users.length % palette.length],
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    setUser(newUser);
    setRememberedUser(newUser);
    saveUsers(nextUsers).catch(() => undefined);
    saveSessionUserId(newUser.id).catch(() => undefined);
    return { ok: true as const };
  }, [users]);

  const continueWithRememberedSession = useCallback(() => {
    if (!rememberedUser) return { ok: false as const, error: "No saved session." };
    setUser(rememberedUser);
    saveSessionUserId(rememberedUser.id).catch(() => undefined);
    return { ok: true as const };
  }, [rememberedUser]);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setRememberedUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, users, rememberedUser, loading, login, signup, continueWithRememberedSession, logout }),
    [user, users, rememberedUser, loading, login, signup, continueWithRememberedSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
